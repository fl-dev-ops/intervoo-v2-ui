import { prisma } from "@/lib/db";
import {
  type DiagnosticConfidenceLevel,
  type DiagnosticLanguageDimension,
  type DiagnosticLanguageLevel,
  type DiagnosticsHydratedReport,
  type DiagnosticsReport,
  type DiagnosticThinkingLevel,
  diagnosticsReportSchema,
} from "@/lib/diagnostics/report-schema";
import { generateReport } from "./generate-report";
import { buildDiagnosticRubric } from "./rubrics";
import {
  buildReportTranscriptPromptText,
  getReportTranscriptMessages,
} from "./transcript";

export type DiagnosticRoundReport = DiagnosticsHydratedReport;

export async function generateDiagnosticReport(sessionId: string) {
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: {
      user: { include: { profile: true } },
      diagnosticRound: { include: { diagnostic: true } },
    },
  });

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  if (session.type !== "DIAGNOSTIC_ROUND") {
    throw new Error(`Session type is not DIAGNOSTIC_ROUND: ${session.type}`);
  }

  const profile = session.user.profile;
  const metadata = (session.metadata as Record<string, unknown>) || {};
  const transcriptMessages = getReportTranscriptMessages(session.transcript);
  const userMessages = transcriptMessages.filter(
    (message) => message.role === "user",
  );
  const transcriptPromptText = buildReportTranscriptPromptText(
    session.transcript,
  );

  if (!transcriptPromptText) {
    throw new Error("No transcript is available for this session");
  }

  if (userMessages.length < 2) {
    throw new Error(
      "Diagnostic report is unavailable because no relevant answers were provided",
    );
  }

  const roundId = session.diagnosticRound
    ? `Round ${session.diagnosticRound.roundNumber}: ${session.diagnosticRound.roundType}`
    : typeof metadata.roundId === "string"
      ? metadata.roundId
      : null;
  const selectedJob = metadata.selected_job as
    | { title?: unknown; id?: unknown; band?: unknown }
    | undefined;
  const jobTitle =
    typeof selectedJob?.title === "string" ? selectedJob.title : null;
  const jobBand =
    typeof metadata.band === "string"
      ? metadata.band
      : typeof selectedJob?.id === "string"
        ? selectedJob.id
        : typeof selectedJob?.band === "string"
          ? selectedJob.band
          : null;

  const prompt = buildDiagnosticRubric({
    participantName: profile?.preferredName || session.user.name || "Learner",
    roundId,
    jobTitle,
    jobBand,
    transcriptPromptText,
  });

  const reportJson = await generateReport({
    prompt,
    schema: diagnosticsReportSchema,
    system:
      "You are a strict diagnostic evaluation engine. Return only the structured JSON object requested by the schema.",
  });

  return hydrateDiagnosticReport(reportJson);
}

export function toHydratedDiagnosticReport(
  reportJson: unknown,
): DiagnosticsHydratedReport | null {
  if (
    !reportJson ||
    typeof reportJson !== "object" ||
    Array.isArray(reportJson)
  ) {
    return null;
  }

  const assessment = (reportJson as { assessment_result?: unknown })
    .assessment_result;

  if (
    assessment &&
    typeof assessment === "object" &&
    "total_score" in assessment
  ) {
    return reportJson as DiagnosticsHydratedReport;
  }

  const parsed = diagnosticsReportSchema.safeParse(reportJson);
  if (!parsed.success) {
    return null;
  }

  return hydrateDiagnosticReport(parsed.data);
}

function hydrateDiagnosticReport(
  report: DiagnosticsReport,
): DiagnosticsHydratedReport {
  const thinkingScore = scoreThinking(report.assessment_result.thinking_level);
  const confidenceScore = scoreConfidence(
    report.assessment_result.confidence_level,
  );
  const languageScore = scoreLanguage(report.assessment_result.language_levels);
  const totalScore1To5 = average([
    thinkingScore,
    confidenceScore,
    languageScore,
  ]);
  const totalScore = score1To5AsPercent(totalScore1To5);

  return {
    ...report,
    assessment_result: {
      total_score: round(totalScore, 2),
      thinking_avg: round(score1To5AsPercent(thinkingScore), 2),
      confidence_avg: round(score1To5AsPercent(confidenceScore), 2),
      language_avg: round(score1To5AsPercent(languageScore), 2),
      salary_lpa: round(3.5 + (totalScore / 100) * (67 - 3.5), 2),
      salary_band: getSalaryBandForScore(totalScore),
      salary_percentile: round(totalScore / 100, 3),
      thinking_level: report.assessment_result.thinking_level,
      confidence_level: report.assessment_result.confidence_level,
      language_levels: report.assessment_result.language_levels,
      thinking_reasoning: report.assessment_result.thinking_reasoning,
      confidence_reasoning: report.assessment_result.confidence_reasoning,
      language_reasoning: report.assessment_result.language_reasoning,
    },
  };
}

const CEFR_SCORE_MAP: Record<DiagnosticLanguageLevel, number> = {
  "Pre-A1": 1,
  A1: 1,
  A2: 2,
  B1: 2,
  B2: 3,
  C1: 4,
  C2: 5,
};

const THINKING_SCORE_MAP: Record<DiagnosticThinkingLevel, number> = {
  TF1: 1,
  TF2: 2,
  TF3: 3,
  TF4: 4,
  TF5: 5,
};

const CONFIDENCE_SCORE_MAP: Record<DiagnosticConfidenceLevel, number> = {
  VCP1: 1,
  VCP2: 2.33,
  VCP3: 3.67,
  VCP4: 5,
};

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function score1To5AsPercent(score: number) {
  return (score / 5) * 100;
}

function getSalaryBandForScore(totalScore: number) {
  if (totalScore >= 80) {
    return "₹35+ LPA";
  }
  if (totalScore >= 50) {
    return "₹15-35 LPA";
  }
  return "₹3.5-15 LPA";
}

function scoreLanguageDimension(level: string | undefined | null) {
  if (!level) {
    return 0;
  }
  return CEFR_SCORE_MAP[level as DiagnosticLanguageLevel] ?? 0;
}

function scoreThinking(level: string | undefined | null) {
  if (!level) {
    return 0;
  }
  return THINKING_SCORE_MAP[level as DiagnosticThinkingLevel] ?? 0;
}

function scoreConfidence(level: string | undefined | null) {
  if (!level) {
    return 0;
  }
  return CONFIDENCE_SCORE_MAP[level as DiagnosticConfidenceLevel] ?? 0;
}

function scoreLanguage(
  languageLevels:
    | Partial<Record<DiagnosticLanguageDimension, DiagnosticLanguageLevel>>
    | undefined,
) {
  if (!languageLevels) {
    return 0;
  }
  return average(
    Object.values(languageLevels).map((level) => scoreLanguageDimension(level)),
  );
}
