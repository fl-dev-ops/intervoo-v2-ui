import { prisma } from "#/db.server";
import { getDiagnosticWebhookReceiver } from "#/diagnostic/livekit.server";
import { EVALUATION_MODEL_ID, generateEvaluationText } from "#/lib/evaluation/openrouter.server";
import { asJsonObject, mergeJsonObject, toJsonValue } from "#/pre-screening/pre-screening-metadata";
import {
  buildPreScreenPrompt,
  parsePreScreenReportResponse,
} from "#/pre-screening/pre-screening-report";
import {
  buildPreScreenTranscriptPromptText,
  getPreScreenSessionTranscriptMessages,
} from "#/pre-screening/pre-screening-transcript";
import {
  getPreScreenWebhookReceiver,
  shouldAllowUnverifiedLiveKitWebhook,
} from "#/pre-screening/livekit.server";

export type LiveKitWebhookEvent = {
  event?: string;
  room?: { name?: string | null } | null;
  participant?: { identity?: string | null; name?: string | null } | null;
  egressInfo?: {
    egressId?: string | null;
    roomName?: string | null;
    fileResults?: Array<{ location?: string | null }>;
  } | null;
};

function getEventRoomName(event: LiveKitWebhookEvent) {
  return event.room?.name ?? null;
}

function isAgentParticipant(event: LiveKitWebhookEvent) {
  const identity = event.participant?.identity?.toLowerCase() ?? "";
  const name = event.participant?.name?.toLowerCase() ?? "";
  return identity.includes("agent") || name.includes("agent");
}

async function markSessionCompleted(roomName: string) {
  const session = await prisma.preScreenSession.findUnique({
    where: { roomName },
  });

  if (!session) {
    return;
  }

  if (session.status !== "STARTED" && session.endedAt) {
    return;
  }

  await prisma.preScreenSession.update({
    where: { id: session.id },
    data: {
      status: session.status === "REPORT_READY" ? "REPORT_READY" : "COMPLETED",
      endedAt: session.endedAt ?? new Date(),
    },
  });
}

export async function parseLiveKitWebhookEvent(request: Request): Promise<LiveKitWebhookEvent> {
  const body = await request.text();
  const authHeader = request.headers.get("Authorization");

  if (authHeader) {
    const receivers = [getPreScreenWebhookReceiver, getDiagnosticWebhookReceiver];

    const attempts = receivers.map(async (getReceiver) => {
      const receiver = getReceiver();
      return receiver.receive(body, authHeader) as Promise<LiveKitWebhookEvent>;
    });

    const results = await Promise.allSettled(attempts);

    for (const result of results) {
      if (result.status === "fulfilled") {
        return result.value;
      }
    }

    throw new Response("Invalid webhook authorization header", { status: 401 });
  }

  if (shouldAllowUnverifiedLiveKitWebhook()) {
    return JSON.parse(body) as LiveKitWebhookEvent;
  }

  throw new Response("Missing webhook authorization header", { status: 401 });
}

async function acquireSessionReportForEvaluation(sessionId: string, options?: { force?: boolean }) {
  const existing = await prisma.preScreenSessionReport.findUnique({
    where: { sessionId },
  });

  if (!existing) {
    const report = await prisma.preScreenSessionReport.create({
      data: {
        sessionId,
        status: "PROCESSING",
        errorMessage: null,
        metadata: toJsonValue({
          evaluationState: "PROCESSING",
        }),
      },
    });

    return {
      report,
      shouldProcess: true,
    };
  }

  if (!options?.force && existing.status !== "PENDING") {
    return {
      report: existing,
      shouldProcess: false,
    };
  }

  const report = await prisma.preScreenSessionReport.update({
    where: { id: existing.id },
    data: {
      status: "PROCESSING",
      errorMessage: null,
      metadata: toJsonValue(
        mergeJsonObject(existing.metadata, {
          evaluationState: "PROCESSING",
          error: null,
        }),
      ),
    },
  });

  return {
    report,
    shouldProcess: true,
  };
}

function buildEvaluationMetadata(input: {
  existing: unknown;
  model?: string;
  evaluationState?: string;
  promptVersion?: string;
  transcriptMessageCount?: number;
  transcriptCharacterCount?: number;
  error?: string | null;
}) {
  return mergeJsonObject(input.existing, {
    model: input.model ?? null,
    evaluationState: input.evaluationState ?? null,
    promptVersion: input.promptVersion ?? null,
    transcriptMessageCount: input.transcriptMessageCount ?? null,
    transcriptCharacterCount: input.transcriptCharacterCount ?? null,
    error: input.error ?? null,
  });
}

async function evaluatePreScreenSession(sessionId: string, options?: { force?: boolean }) {
  const session = await prisma.preScreenSession.findUnique({
    where: { id: sessionId },
    include: { report: true, draft: true },
  });

  if (!session) {
    throw new Error("Pre-screen session not found");
  }

  const claimed = await acquireSessionReportForEvaluation(session.id, {
    force: options?.force,
  });

  if (!claimed.shouldProcess) {
    return;
  }

  if (!process.env.OPENROUTER_API_KEY) {
    await prisma.preScreenSessionReport.update({
      where: { id: claimed.report.id },
      data: {
        status: "FAILED",
        errorMessage: "OPENROUTER_API_KEY is not configured",
        metadata: toJsonValue(
          mergeJsonObject(claimed.report.metadata, {
            evaluationState: "FAILED",
            error: "OPENROUTER_API_KEY is not configured",
          }),
        ),
      },
    });
    return;
  }

  const transcriptMessages = getPreScreenSessionTranscriptMessages(session.transcript);
  const transcriptPromptText = buildPreScreenTranscriptPromptText(transcriptMessages);
  const draftContext = asJsonObject(session.draft.latestAgentContext);
  const draftProfile = asJsonObject(draftContext.profile);
  const { prompt, promptVersion } = await buildPreScreenPrompt({
    name: typeof draftContext.studentName === "string" ? draftContext.studentName : null,
    college: typeof draftProfile.institution === "string" ? draftProfile.institution : null,
    degree: typeof draftProfile.degree === "string" ? draftProfile.degree : null,
    stream: typeof draftProfile.stream === "string" ? draftProfile.stream : null,
    year: typeof draftProfile.yearOfStudy === "string" ? draftProfile.yearOfStudy : null,
  });

  try {
    if (!transcriptMessages.length || !transcriptPromptText) {
      throw new Error("No transcript is available for this session yet");
    }

    const result = await generateEvaluationText({
      temperature: 0,
      userContent: [
        {
          type: "text",
          text: `${prompt}

Conversation transcript (ordered, includes student and agent):
${transcriptPromptText}`,
        },
      ],
    });

    const rawResponse = result.text ?? "";
    const reportJson = parsePreScreenReportResponse(rawResponse);
    const reportMetadata = buildEvaluationMetadata({
      existing: claimed.report.metadata,
      model: EVALUATION_MODEL_ID,
      evaluationState: "READY",
      promptVersion,
      transcriptMessageCount: transcriptMessages.length,
      transcriptCharacterCount: transcriptPromptText.length,
      error: null,
    });

    await prisma.preScreenSessionReport.update({
      where: { id: claimed.report.id },
      data: {
        status: "READY",
        promptVersion,
        fileUri: null,
        reportJson: toJsonValue(reportJson),
        errorMessage: null,
        metadata: toJsonValue({
          ...reportMetadata,
          rawText: rawResponse,
        }),
      },
    });

    await prisma.preScreenSession.update({
      where: { id: session.id },
      data: {
        status: "REPORT_READY",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to evaluate pre-screen session";
    const failedMetadata = buildEvaluationMetadata({
      existing: claimed.report.metadata,
      model: EVALUATION_MODEL_ID,
      evaluationState: "FAILED",
      promptVersion,
      transcriptMessageCount: transcriptMessages.length,
      transcriptCharacterCount: transcriptPromptText.length,
      error: message,
    });

    await prisma.preScreenSessionReport.update({
      where: { id: claimed.report.id },
      data: {
        status: "FAILED",
        promptVersion,
        errorMessage: message,
        metadata: toJsonValue(failedMetadata),
      },
    });

    await prisma.preScreenSession.update({
      where: { id: session.id },
      data: {
        status: "COMPLETED",
      },
    });
  }
}

export async function retryPreScreenSessionEvaluation(
  sessionId: string,
  options?: { force?: boolean },
) {
  await evaluatePreScreenSession(sessionId, { force: options?.force ?? true });
}

export async function triggerPreScreenSessionEvaluation(
  sessionId: string,
  options?: { force?: boolean },
) {
  await evaluatePreScreenSession(sessionId, { force: options?.force ?? false });
}

export async function handlePreScreenLiveKitWebhookEvent(event: LiveKitWebhookEvent) {
  const roomName = getEventRoomName(event);

  if (!roomName) {
    return;
  }

  if (event.event === "room_finished") {
    await markSessionCompleted(roomName);
  }

  if (event.event === "participant_left" && isAgentParticipant(event)) {
    await markSessionCompleted(roomName);
  }
}
