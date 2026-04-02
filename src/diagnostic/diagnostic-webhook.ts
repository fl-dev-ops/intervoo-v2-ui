import { NoObjectGeneratedError } from "ai";
import { prisma } from "#/db.server";
import {
  buildRemoteFilePart,
  EVALUATION_MODEL_ID,
  generateEvaluationObject,
} from "#/lib/evaluation/openrouter.server";
import {
  buildDiagnosticPrompt,
  diagnosticReportGenerationSchema,
  normalizeDiagnosticReport,
} from "#/diagnostic/diagnostic-report";
import { getPresignedVideoUrl } from "#/diagnostic/s3";
import {
  buildDiagnosticTranscriptPromptText,
  getDiagnosticSessionTranscriptMessages,
} from "#/diagnostic/diagnostic-transcript";
import { isDiagnosticEgressEnabled } from "#/diagnostic/livekit.server";
import { mergeJsonObject, toJsonValue } from "#/pre-screening/pre-screening-metadata";
import type { LiveKitWebhookEvent } from "#/pre-screening/pre-screening-webhook";

function getEventRoomName(event: LiveKitWebhookEvent) {
  return event.egressInfo?.roomName ?? event.room?.name ?? null;
}

function getVideoUrlFromEvent(event: LiveKitWebhookEvent) {
  return event.egressInfo?.fileResults?.[0]?.location ?? null;
}

function isAgentParticipant(event: LiveKitWebhookEvent) {
  const identity = event.participant?.identity?.toLowerCase() ?? "";
  const name = event.participant?.name?.toLowerCase() ?? "";
  return identity.includes("agent") || name.includes("agent");
}

async function findDiagnosticSessionByRoomName(roomName: string) {
  return await prisma.diagnosticSession.findUnique({
    where: { roomName },
  });
}

async function updateDiagnosticSessionFromEgressEvent(
  roomName: string,
  event: LiveKitWebhookEvent,
) {
  if (!isDiagnosticEgressEnabled()) {
    return null;
  }

  const session = await findDiagnosticSessionByRoomName(roomName);

  if (!session) {
    return null;
  }

  const videoUrl = getVideoUrlFromEvent(event);
  const egressId = event.egressInfo?.egressId ?? session.egressId ?? null;

  await prisma.diagnosticSession.update({
    where: { id: session.id },
    data: {
      videoUrl: videoUrl ?? session.videoUrl,
      egressId,
      endedAt: session.endedAt ?? new Date(),
      status: session.status === "REPORT_READY" ? "REPORT_READY" : "COMPLETED",
    },
  });

  return session.id;
}

async function markDiagnosticSessionCompleted(roomName: string) {
  const session = await findDiagnosticSessionByRoomName(roomName);

  if (!session) {
    return null;
  }

  if (session.status !== "STARTED" && session.endedAt) {
    return session.id;
  }

  await prisma.diagnosticSession.update({
    where: { id: session.id },
    data: {
      status: session.status === "REPORT_READY" ? "REPORT_READY" : "COMPLETED",
      endedAt: session.endedAt ?? new Date(),
    },
  });

  return session.id;
}

async function acquireDiagnosticReportForEvaluation(
  sessionId: string,
  options?: { force?: boolean },
) {
  const existing = await prisma.diagnosticSessionReport.findUnique({
    where: { sessionId },
  });

  if (!existing) {
    const report = await prisma.diagnosticSessionReport.create({
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

  const report = await prisma.diagnosticSessionReport.update({
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

function buildDiagnosticEvaluationMetadata(input: {
  existing: unknown;
  model?: string;
  evaluationState?: string;
  promptVersion?: string;
  transcriptMessageCount?: number;
  transcriptCharacterCount?: number;
  videoUrl?: string | null;
  error?: string | null;
}) {
  return mergeJsonObject(input.existing, {
    model: input.model ?? null,
    evaluationState: input.evaluationState ?? null,
    promptVersion: input.promptVersion ?? null,
    transcriptMessageCount: input.transcriptMessageCount ?? null,
    transcriptCharacterCount: input.transcriptCharacterCount ?? null,
    videoUrl: input.videoUrl ?? null,
    error: input.error ?? null,
  });
}

async function markDiagnosticReportPendingAssets(input: {
  reportId: string;
  existingMetadata: unknown;
  promptVersion: string;
  transcriptMessageCount: number;
  transcriptCharacterCount: number;
  videoUrl: string | null;
  error?: string | null;
}) {
  await prisma.diagnosticSessionReport.update({
    where: { id: input.reportId },
    data: {
      status: "PENDING",
      promptVersion: input.promptVersion,
      errorMessage: null,
      metadata: toJsonValue(
        buildDiagnosticEvaluationMetadata({
          existing: input.existingMetadata,
          model: EVALUATION_MODEL_ID,
          evaluationState: "WAITING_FOR_ASSETS",
          promptVersion: input.promptVersion,
          transcriptMessageCount: input.transcriptMessageCount,
          transcriptCharacterCount: input.transcriptCharacterCount,
          videoUrl: input.videoUrl,
          error: input.error ?? null,
        }),
      ),
    },
  });
}

async function evaluateDiagnosticSession(sessionId: string, options?: { force?: boolean }) {
  const session = await prisma.diagnosticSession.findUnique({
    where: { id: sessionId },
    include: { report: true },
  });

  if (!session) {
    throw new Error("Diagnostic session not found");
  }

  const claimed = await acquireDiagnosticReportForEvaluation(session.id, {
    force: options?.force,
  });

  if (!claimed.shouldProcess) {
    return;
  }

  if (!process.env.OPENROUTER_API_KEY) {
    await prisma.diagnosticSessionReport.update({
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

  if (!isDiagnosticEgressEnabled()) {
    await prisma.diagnosticSessionReport.update({
      where: { id: claimed.report.id },
      data: {
        status: "FAILED",
        errorMessage: "Diagnostic egress is disabled. Set DIAGNOSTIC_EGRESS_ENABLED=true.",
        metadata: toJsonValue(
          mergeJsonObject(claimed.report.metadata, {
            evaluationState: "FAILED",
            error: "Diagnostic egress is disabled. Set DIAGNOSTIC_EGRESS_ENABLED=true.",
          }),
        ),
      },
    });
    return;
  }

  const transcriptMessages = getDiagnosticSessionTranscriptMessages(session.transcript);
  const transcriptPromptText = buildDiagnosticTranscriptPromptText(transcriptMessages);
  const { prompt, promptVersion } = buildDiagnosticPrompt();

  if (!transcriptMessages.length || !transcriptPromptText || !session.videoUrl) {
    await markDiagnosticReportPendingAssets({
      reportId: claimed.report.id,
      existingMetadata: claimed.report.metadata,
      promptVersion,
      transcriptMessageCount: transcriptMessages.length,
      transcriptCharacterCount: transcriptPromptText.length,
      videoUrl: session.videoUrl,
      error: !session.videoUrl ? "Waiting for diagnostic video egress" : null,
    });
    return;
  }

  try {
    const signedVideoUrl = await getPresignedVideoUrl({
      objectUrl: session.videoUrl,
    });

    const result = await generateEvaluationObject({
      schema: diagnosticReportGenerationSchema,
      temperature: 0,
      userContent: [
        {
          type: "text",
          text: `${prompt}

Conversation transcript (ordered, includes student and agent):
${transcriptPromptText}

The diagnostic session video is attached as a file part. Use both transcript and video evidence.`,
        },
        buildRemoteFilePart({
          url: signedVideoUrl,
          mediaType: "video/mp4",
          filename: `diagnostic-${session.id}.mp4`,
        }),
      ],
    });

    const reportJson = normalizeDiagnosticReport(result.object);
    const reportMetadata = buildDiagnosticEvaluationMetadata({
      existing: claimed.report.metadata,
      model: EVALUATION_MODEL_ID,
      evaluationState: "READY",
      promptVersion,
      transcriptMessageCount: transcriptMessages.length,
      transcriptCharacterCount: transcriptPromptText.length,
      videoUrl: session.videoUrl,
      error: null,
    });

    await prisma.diagnosticSessionReport.update({
      where: { id: claimed.report.id },
      data: {
        status: "READY",
        promptVersion,
        fileUri: session.videoUrl,
        reportJson: toJsonValue(reportJson),
        errorMessage: null,
        metadata: toJsonValue(reportMetadata),
      },
    });

    await prisma.diagnosticSession.update({
      where: { id: session.id },
      data: {
        status: "REPORT_READY",
      },
    });
  } catch (error) {
    let message = error instanceof Error ? error.message : "Failed to evaluate diagnostic session";

    if (NoObjectGeneratedError.isInstance(error)) {
      const preview = error.text?.trim();
      const previewSuffix =
        preview && preview.length > 0
          ? ` Model output: ${preview.slice(0, 280)}${preview.length > 280 ? "..." : ""}`
          : "";
      message = `Diagnostic report parsing failed. Retry once.${previewSuffix}`;
    }

    const failedMetadata = buildDiagnosticEvaluationMetadata({
      existing: claimed.report.metadata,
      model: EVALUATION_MODEL_ID,
      evaluationState: "FAILED",
      promptVersion,
      transcriptMessageCount: transcriptMessages.length,
      transcriptCharacterCount: transcriptPromptText.length,
      videoUrl: session.videoUrl,
      error: message,
    });

    await prisma.diagnosticSessionReport.update({
      where: { id: claimed.report.id },
      data: {
        status: "FAILED",
        promptVersion,
        errorMessage: message,
        metadata: toJsonValue(failedMetadata),
      },
    });

    await prisma.diagnosticSession.update({
      where: { id: session.id },
      data: {
        status: "COMPLETED",
      },
    });
  }
}

export async function triggerDiagnosticSessionEvaluation(
  sessionId: string,
  options?: { force?: boolean },
) {
  await evaluateDiagnosticSession(sessionId, {
    force: options?.force ?? false,
  });
}

export async function retryDiagnosticSessionEvaluation(
  sessionId: string,
  options?: { force?: boolean },
) {
  await evaluateDiagnosticSession(sessionId, { force: options?.force ?? true });
}

export async function handleDiagnosticLiveKitWebhookEvent(event: LiveKitWebhookEvent) {
  const roomName = getEventRoomName(event);

  if (!roomName) {
    return;
  }

  if (event.event === "egress_ended") {
    const sessionId = await updateDiagnosticSessionFromEgressEvent(roomName, event);

    if (sessionId) {
      await triggerDiagnosticSessionEvaluation(sessionId);
    }
    return;
  }

  if (event.event === "room_finished") {
    const sessionId = await markDiagnosticSessionCompleted(roomName);

    if (sessionId) {
      await triggerDiagnosticSessionEvaluation(sessionId);
    }
    return;
  }

  if (event.event === "participant_left" && isAgentParticipant(event)) {
    const sessionId = await markDiagnosticSessionCompleted(roomName);

    if (sessionId) {
      await triggerDiagnosticSessionEvaluation(sessionId);
    }
  }
}
