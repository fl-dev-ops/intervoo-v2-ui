import { z } from "zod";
import type {
  DiagnosticCefrLevel,
  DiagnosticReport,
  DiagnosticScoreBand,
} from "#/diagnostic/types";

const cefrLevelSchema = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);
const DIAGNOSTIC_PROMPT_FILE_NAME = "diagnostic-report.ts";

export const diagnosticReportGenerationSchema = z.object({
  cefr_level: cefrLevelSchema,
  thinking_score: z.coerce.number().min(0).max(100),
  confidence_score: z.coerce.number().min(0).max(100),
  language_score: z.coerce.number().min(0).max(100),
});

const CEFR_LABEL_BY_LEVEL: Record<DiagnosticCefrLevel, string> = {
  A1: "Beginner English",
  A2: "Elementary English",
  B1: "Intermediate English",
  B2: "Upper-Intermediate English",
  C1: "Advanced English",
  C2: "Proficient English",
};

function normalizeScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getDiagnosticScoreBand(score: number): DiagnosticScoreBand {
  if (score <= 50) {
    return "MIN";
  }

  if (score <= 80) {
    return "LOW";
  }

  return "HIGH";
}

function getOverallRangeLabel(overallBand: DiagnosticScoreBand) {
  if (overallBand === "HIGH") {
    return "Good to Great range";
  }

  if (overallBand === "LOW") {
    return "OK to Good range";
  }

  return "Foundational improvement needed";
}

export function buildDiagnosticPrompt() {
  const prompt = `You are evaluating a student interview using transcript + video evidence.

Score each dimension from 0 to 100:
- thinking_score: quality of thought structure, clarity, and relevance
- confidence_score: confidence, composure, and delivery stability
- language_score: grammar, vocabulary, pronunciation, and fluency

Assign CEFR level from A1/A2/B1/B2/C1/C2.

Strict rules:
- Be evidence-based and conservative.
- If a signal is weak, score lower.
- Return JSON only matching the schema.
- No markdown or extra keys.
- Scores must be JSON numbers (not strings).

	Output JSON shape:
		{
		  "cefr_level": "A1 | A2 | B1 | B2 | C1 | C2",
		  "thinking_score": 0,
		  "confidence_score": 0,
		  "language_score": 0
		}`;

  const promptVersion = DIAGNOSTIC_PROMPT_FILE_NAME;

  return {
    prompt,
    promptVersion,
  };
}

export function normalizeDiagnosticReport(
  raw: z.infer<typeof diagnosticReportGenerationSchema>,
): DiagnosticReport {
  const thinkingScore = normalizeScore(raw.thinking_score);
  const confidenceScore = normalizeScore(raw.confidence_score);
  const languageScore = normalizeScore(raw.language_score);
  const overallScore = Math.min(thinkingScore, confidenceScore, languageScore);
  const overallBand = getDiagnosticScoreBand(overallScore);
  const cefrLevel = raw.cefr_level;
  const defaultCefrLabel = CEFR_LABEL_BY_LEVEL[cefrLevel];

  return {
    overallScore,
    overallBand,
    cefrLevel,
    cefrLabel: defaultCefrLabel,
    rangeLabel: getOverallRangeLabel(overallBand),
    thinking: {
      score: thinkingScore,
      band: getDiagnosticScoreBand(thinkingScore),
    },
    confidence: {
      score: confidenceScore,
      band: getDiagnosticScoreBand(confidenceScore),
    },
    language: {
      score: languageScore,
      band: getDiagnosticScoreBand(languageScore),
    },
  };
}
