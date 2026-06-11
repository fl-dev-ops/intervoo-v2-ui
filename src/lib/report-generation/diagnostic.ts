import { prisma } from "@/lib/db";
import { buildDiagnosticReportPrompt } from "./diagnostic-prompt";
import type {
  DiagnosticReportJson,
  DiagnosticReportMetadata,
} from "./diagnostic-report.types";
import {
  buildDiagnosticTranscriptPromptText,
  createDiagnosticReportGenerationSchema,
  parseDiagnosticStoredReportJson,
} from "./diagnostic-schema";
import { scoreAssessment } from "./diagnostic-scoring";
import {
  extractRetrievedQuestions,
  extractTranscriptMessages,
  fetchTranscriptFromUrl,
} from "./diagnostic-transcript";

export type DiagnosticRoundReport = DiagnosticReportJson;
export const DEFAULT_DIAGNOSTIC_REPORT_MODEL_ID = "gemini-2.5-flash";

export async function prepareDiagnosticReportGeneration(sessionId: string) {
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: {
      user: { include: { resume: true } },
      diagnosticRound: { include: { diagnostic: true } },
    },
  });

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  if (session.type !== "DIAGNOSTIC_ROUND") {
    throw new Error(`Session type is not DIAGNOSTIC_ROUND: ${session.type}`);
  }

  const resume = session.user.resume;
  const transcriptUrl = session.transcriptUrl;
  const audioUrl = session.audioUrl;

  if (!audioUrl) {
    throw new Error("No audio recording is available for this session");
  }

  if (!transcriptUrl) {
    throw new Error("No transcript URL is available for this session");
  }

  // 1. Fetch transcript JSON from URL
  const transcriptJson = await fetchTranscriptFromUrl(transcriptUrl);
  if (!transcriptJson) {
    throw new Error("No transcript is available for this session");
  }

  // 2. Extract messages and questions
  const transcriptMessages = extractTranscriptMessages(transcriptJson);
  const retrievedQuestions = extractRetrievedQuestions(transcriptJson);

  console.info("[diagnostics] diagnostic report input", {
    hasTranscript: Boolean(transcriptJson),
    hasAudio: Boolean(audioUrl),
    transcriptMessageCount: transcriptMessages.length,
    retrievedQuestionCount: retrievedQuestions.length,
    sessionId,
  });

  if (!transcriptMessages.length) {
    throw new Error("No transcript messages found");
  }

  const userMessages = transcriptMessages.filter((m) => m.role === "user");
  if (userMessages.length < 2) {
    throw new Error(
      "Diagnostic report is unavailable because no relevant answers were provided",
    );
  }

  if (!retrievedQuestions.length) {
    throw new Error(
      "No asked diagnostic questions captured for this session — cannot generate report",
    );
  }

  const transcriptPromptText =
    buildDiagnosticTranscriptPromptText(transcriptMessages);

  // 3. Build prompt
  const participantName =
    resume?.name || session.user.name || "Learner";
  const prompt = buildDiagnosticReportPrompt({
    participantName,
    transcriptPromptText,
    questions: retrievedQuestions,
  });

  return {
    modelId:
      process.env.DIAGNOSTIC_REPORT_MODEL_ID ??
      DEFAULT_DIAGNOSTIC_REPORT_MODEL_ID,
    prompt,
    questions: retrievedQuestions,
    schema: createDiagnosticReportGenerationSchema(retrievedQuestions),
  };
}

export function buildDiagnosticReportResult(generatedReport: unknown) {
  const storedReport = parseDiagnosticStoredReportJson(generatedReport);

  const scoringResult = scoreAssessment(
    storedReport.assessment_result.question_responses,
  );

  const hydratedReport: DiagnosticReportJson = {
    ...storedReport,
    assessment_result: scoringResult,
  };

  const metadata: DiagnosticReportMetadata = {
    scoring: scoringResult,
    hydratedReport,
    generatedAt: new Date().toISOString(),
    model:
      process.env.DIAGNOSTIC_REPORT_MODEL_ID ??
      DEFAULT_DIAGNOSTIC_REPORT_MODEL_ID,
  };

  return {
    baseReport: storedReport as unknown as Record<string, unknown>,
    metadata: metadata as unknown as Record<string, unknown>,
  };
}

export function toHydratedDiagnosticReport(
  reportJson: unknown,
): DiagnosticReportJson | null {
  if (
    !reportJson ||
    typeof reportJson !== "object" ||
    Array.isArray(reportJson)
  ) {
    return null;
  }

  const obj = reportJson as Record<string, unknown>;

  // Already hydrated (has total_score in assessment_result)
  const assessment = obj.assessment_result as
    | Record<string, unknown>
    | undefined;
  if (assessment && typeof assessment.total_score === "number") {
    return reportJson as DiagnosticReportJson;
  }

  return null;
}

export function getHydratedReportFromMetadata(
  metadata: unknown,
): DiagnosticReportJson | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const obj = metadata as Record<string, unknown>;
  const hydrated = obj.hydratedReport;
  if (hydrated && typeof hydrated === "object" && !Array.isArray(hydrated)) {
    return hydrated as DiagnosticReportJson;
  }
  return null;
}
