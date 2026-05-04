import { prisma } from "#/db.server";
import type { DiagnosticBand, DiagnosticJobOption } from "#/lib/diagnostics/job-options";
import type { DiagnosticsReportStatusResponse } from "#/lib/diagnostics/report";
import {
  buildDiagnosticsSessionTranscript,
  getDiagnosticsSessionTranscriptMessages,
  sanitizeDiagnosticsTranscriptMessages,
  type DiagnosticsSessionTranscript,
} from "#/lib/diagnostics/transcript";
import { toJsonValue } from "#/lib/prediagnostics/prisma-utils";

export async function finalizeDiagnosticSession(input: {
  sessionId: string;
  userId: string;
  transcript?: unknown;
  messages?: unknown;
}) {
  const session = await prisma.diagnosticSession.findUnique({
    where: { id: input.sessionId },
  });

  if (!session || session.userId !== input.userId) {
    return null;
  }

  const existingTranscriptMessages = getDiagnosticsSessionTranscriptMessages(session.transcript);
  const incomingTranscript = input.transcript as DiagnosticsSessionTranscript | undefined;
  const incomingTranscriptMessages = Array.isArray(incomingTranscript?.messages)
    ? sanitizeDiagnosticsTranscriptMessages(incomingTranscript.messages)
    : sanitizeDiagnosticsTranscriptMessages(input.messages);
  const transcriptMessages =
    incomingTranscriptMessages.length > 0 ? incomingTranscriptMessages : existingTranscriptMessages;
  const transcript = buildDiagnosticsSessionTranscript(transcriptMessages);

  await prisma.diagnosticSession.update({
    where: { id: session.id },
    data: {
      transcript: toJsonValue(transcript),
      status: "COMPLETED",
      endedAt: session.endedAt ?? new Date(),
    },
  });

  await prisma.diagnosticSessionReport.upsert({
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

export async function getDiagnosticSessionStatus(input: {
  sessionId: string;
  userId: string;
}): Promise<DiagnosticsReportStatusResponse | null> {
  const session = await prisma.diagnosticSession.findUnique({
    where: { id: input.sessionId },
    include: { report: true },
  });

  if (!session || session.userId !== input.userId) {
    return null;
  }

  return mapSessionToStatusResponse(session);
}

function mapSessionToStatusResponse(session: {
  id: string;
  status: string;
  band: string;
  selectedJob: unknown;
  roomName: string;
  startedAt: Date;
  endedAt: Date | null;
  transcript: unknown;
  report: {
    id: string;
    status: string;
    promptVersion: string | null;
    reportJson: unknown;
    errorMessage: string | null;
    metadata: unknown;
  } | null;
}): DiagnosticsReportStatusResponse {
  return {
    session: {
      id: session.id,
      status: session.status,
      band: session.band as DiagnosticBand,
      selectedJob: session.selectedJob as DiagnosticJobOption | null,
      roomName: session.roomName,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() ?? null,
      transcript: session.transcript
        ? buildDiagnosticsSessionTranscript(
            getDiagnosticsSessionTranscriptMessages(session.transcript),
          )
        : null,
    },
    report: session.report
      ? {
          id: session.report.id,
          status: session.report.status,
          promptVersion: session.report.promptVersion,
          reportJson: session.report.reportJson,
          errorMessage: session.report.errorMessage,
          metadata: session.report.metadata as Record<string, unknown> | null,
        }
      : null,
  };
}
