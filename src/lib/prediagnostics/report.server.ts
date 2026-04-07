import { prisma } from "#/db.server";
import { EVALUATION_MODEL_ID, generateEvaluationObject } from "#/lib/evaluation/openrouter.server";
import {
  buildPrediagnosticsPrompt,
  prediagnosticsReportSchema,
  type PrediagnosticsReportStatusResponse,
} from "#/lib/prediagnostics/report";
import {
  buildPrediagnosticsSessionTranscript,
  buildPrediagnosticsTranscriptPromptText,
  getPrediagnosticsSessionTranscriptMessages,
  type PrediagnosticsSessionTranscript,
  type PrediagnosticsTranscriptMessage,
  sanitizePrediagnosticsTranscriptMessages,
} from "#/lib/prediagnostics/transcript";
import { mergeJsonObject } from "#/lib/prediagnostics/json-utils";
import { toJsonValue } from "#/lib/prediagnostics/prisma-utils";

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

async function acquirePreDiagnosticSessionReportForEvaluation(
  sessionId: string,
  options?: { force?: boolean },
) {
  const existing = await prisma.preDiagnosticSessionReport.findUnique({
    where: { sessionId },
  });

  if (!existing) {
    const report = await prisma.preDiagnosticSessionReport.create({
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

  const report = await prisma.preDiagnosticSessionReport.update({
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

export async function finalizePreDiagnosticSession(input: {
  sessionId: string;
  userId: string;
  transcript?: unknown;
  messages: unknown;
}) {
  const session = await prisma.preDiagnosticSession.findUnique({
    where: { id: input.sessionId },
  });

  if (!session || session.userId !== input.userId) {
    return null;
  }

  const existingTranscriptMessages = getPrediagnosticsSessionTranscriptMessages(session.transcript);
  const incomingTranscript = input.transcript as PrediagnosticsSessionTranscript | undefined;
  const incomingTranscriptMessages = Array.isArray(incomingTranscript?.messages)
    ? sanitizePrediagnosticsTranscriptMessages(incomingTranscript.messages)
    : sanitizePrediagnosticsTranscriptMessages(input.messages);
  const transcriptMessages =
    incomingTranscriptMessages.length > 0 ? incomingTranscriptMessages : existingTranscriptMessages;
  const transcript = buildPrediagnosticsSessionTranscript(transcriptMessages);

  await prisma.preDiagnosticSession.update({
    where: { id: session.id },
    data: {
      transcript: toJsonValue(transcript),
      status: "COMPLETED",
      endedAt: session.endedAt ?? new Date(),
    },
  });

  await prisma.preDiagnosticSessionReport.upsert({
    where: { sessionId: session.id },
    create: {
      sessionId: session.id,
      status: "PENDING",
      errorMessage: null,
      metadata: toJsonValue({
        evaluationState: "PENDING",
      }),
    },
    update: {
      status: "PENDING",
      errorMessage: null,
      metadata: toJsonValue({
        evaluationState: "PENDING",
      }),
    },
  });

  return {
    sessionId: session.id,
    transcriptMessageCount: transcriptMessages.length,
    transcriptMessages,
  };
}

export async function triggerPreDiagnosticSessionEvaluation(
  sessionId: string,
  options?: { force?: boolean; transcriptMessages?: PrediagnosticsTranscriptMessage[] },
) {
  const session = await prisma.preDiagnosticSession.findUnique({
    where: { id: sessionId },
    include: {
      report: true,
      user: {
        include: {
          profile: true,
        },
      },
    },
  });

  if (!session) {
    throw new Error("Pre-diagnostic session not found");
  }

  const claimed = await acquirePreDiagnosticSessionReportForEvaluation(session.id, {
    force: options?.force,
  });

  if (!claimed.shouldProcess) {
    return;
  }

  if (!process.env.OPENROUTER_API_KEY) {
    await prisma.preDiagnosticSessionReport.update({
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

  const transcriptMessages = options?.transcriptMessages?.length
    ? sanitizePrediagnosticsTranscriptMessages(options.transcriptMessages)
    : getPrediagnosticsSessionTranscriptMessages(session.transcript);
  const transcriptPromptText = buildPrediagnosticsTranscriptPromptText(transcriptMessages);
  const { prompt, promptVersion } = await buildPrediagnosticsPrompt({
    name: session.user.profile?.preferredName || session.user.name,
    college: session.user.profile?.institution ?? null,
    degree: session.user.profile?.degree ?? null,
    stream: session.user.profile?.stream ?? null,
    year: session.user.profile?.yearOfStudy ?? null,
  });

  try {
    if (!transcriptMessages.length || !transcriptPromptText) {
      throw new Error("No transcript is available for this session yet");
    }

    const result = await generateEvaluationObject({
      temperature: 0,
      schema: prediagnosticsReportSchema,
      userContent: [
        {
          type: "text",
          text: `${prompt}

Conversation transcript (ordered, includes student and agent):
${transcriptPromptText}`,
        },
      ],
    });

    const reportJson = result.object;
    const reportMetadata = buildEvaluationMetadata({
      existing: claimed.report.metadata,
      model: EVALUATION_MODEL_ID,
      evaluationState: "READY",
      promptVersion,
      transcriptMessageCount: transcriptMessages.length,
      transcriptCharacterCount: transcriptPromptText.length,
      error: null,
    });

    await prisma.preDiagnosticSessionReport.update({
      where: { id: claimed.report.id },
      data: {
        status: "READY",
        promptVersion,
        fileUri: null,
        reportJson: toJsonValue(reportJson),
        errorMessage: null,
        metadata: toJsonValue({
          ...reportMetadata,
          structuredObject: reportJson,
        }),
      },
    });

    await prisma.preDiagnosticSession.update({
      where: { id: session.id },
      data: {
        status: "REPORT_READY",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to evaluate pre-diagnostic session";
    const failedMetadata = buildEvaluationMetadata({
      existing: claimed.report.metadata,
      model: EVALUATION_MODEL_ID,
      evaluationState: "FAILED",
      promptVersion,
      transcriptMessageCount: transcriptMessages.length,
      transcriptCharacterCount: transcriptPromptText.length,
      error: message,
    });

    await prisma.preDiagnosticSessionReport.update({
      where: { id: claimed.report.id },
      data: {
        status: "FAILED",
        promptVersion,
        errorMessage: message,
        metadata: toJsonValue(failedMetadata),
      },
    });
  }
}

export async function getPreDiagnosticSessionStatus(input: {
  sessionId: string;
  userId: string;
}): Promise<PrediagnosticsReportStatusResponse | null> {
  const session = await prisma.preDiagnosticSession.findUnique({
    where: { id: input.sessionId },
    include: { report: true },
  });

  if (!session || session.userId !== input.userId) {
    return null;
  }

  return mapSessionToStatusResponse(session);
}

export async function getLatestPreDiagnosticSessionStatus(
  userId: string,
): Promise<PrediagnosticsReportStatusResponse | null> {
  const session = await prisma.preDiagnosticSession.findFirst({
    where: {
      userId,
      status: { in: ["COMPLETED", "REPORT_READY"] },
      NOT: {
        report: {
          status: "FAILED",
        },
      },
    },
    orderBy: { startedAt: "desc" },
    include: { report: true },
  });

  if (!session) {
    return null;
  }

  return mapSessionToStatusResponse(session);
}

export async function hasActiveOrCompletedPreDiagnosticSession(userId: string): Promise<boolean> {
  const count = await prisma.preDiagnosticSession.count({
    where: {
      userId,
      status: { in: ["STARTED", "COMPLETED", "REPORT_READY"] },
      NOT: {
        report: {
          status: "FAILED",
        },
      },
    },
  });

  return count > 0;
}

function mapSessionToStatusResponse(session: {
  id: string;
  status: string;
  roomName: string;
  startedAt: Date;
  endedAt: Date | null;
  report: {
    id: string;
    status: string;
    promptVersion: string | null;
    fileUri: string | null;
    reportJson: unknown;
    errorMessage: string | null;
    metadata: unknown;
  } | null;
}): PrediagnosticsReportStatusResponse {
  return {
    session: {
      id: session.id,
      status: session.status,
      roomName: session.roomName,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() ?? null,
    },
    report: session.report
      ? {
          id: session.report.id,
          status: session.report.status,
          promptVersion: session.report.promptVersion,
          fileUri: session.report.fileUri,
          reportJson: session.report
            .reportJson as PrediagnosticsReportStatusResponse["report"] extends {
            reportJson: infer T;
          }
            ? T
            : never,
          errorMessage: session.report.errorMessage,
          metadata: session.report.metadata as Record<string, unknown> | null,
        }
      : null,
  };
}
