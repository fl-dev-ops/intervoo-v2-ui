import { z } from "zod";
import type { DiagnosticQuestion } from "./diagnostic-activity";
import {
  DIAGNOSTIC_CONFIDENCE_LEVEL_VALUES,
  DIAGNOSTIC_LANGUAGE_LEVEL_VALUES,
  DIAGNOSTIC_THINKING_LEVEL_VALUES,
  type DiagnosticStoredReportJson,
  type DiagnosticTranscriptMessage,
} from "./diagnostic-report.types";

const thinkingLevelsSchema = z.object({
  Relevance: z.enum(DIAGNOSTIC_THINKING_LEVEL_VALUES).optional(),
  Specificity: z.enum(DIAGNOSTIC_THINKING_LEVEL_VALUES).optional(),
  Reasoning: z.enum(DIAGNOSTIC_THINKING_LEVEL_VALUES).optional(),
  JobCompetency: z.enum(DIAGNOSTIC_THINKING_LEVEL_VALUES).optional(),
});

const thinkingReasoningSchema = z.object({
  Relevance: z.string().trim().min(1).optional(),
  Specificity: z.string().trim().min(1).optional(),
  Reasoning: z.string().trim().min(1).optional(),
  JobCompetency: z.string().trim().min(1).optional(),
});

const confidenceLevelsSchema = z.object({
  Volume: z.enum(DIAGNOSTIC_CONFIDENCE_LEVEL_VALUES).optional(),
  Pace: z.enum(DIAGNOSTIC_CONFIDENCE_LEVEL_VALUES).optional(),
  Pause: z.enum(DIAGNOSTIC_CONFIDENCE_LEVEL_VALUES).optional(),
  Latency: z.enum(DIAGNOSTIC_CONFIDENCE_LEVEL_VALUES).optional(),
});

const confidenceReasoningSchema = z.object({
  Volume: z.string().trim().min(1).optional(),
  Pace: z.string().trim().min(1).optional(),
  Pause: z.string().trim().min(1).optional(),
  Latency: z.string().trim().min(1).optional(),
});

const languageLevelsSchema = z.object({
  Fluency: z.enum(DIAGNOSTIC_LANGUAGE_LEVEL_VALUES).optional(),
  Grammar: z.enum(DIAGNOSTIC_LANGUAGE_LEVEL_VALUES).optional(),
  Range: z.enum(DIAGNOSTIC_LANGUAGE_LEVEL_VALUES).optional(),
  Coherence: z.enum(DIAGNOSTIC_LANGUAGE_LEVEL_VALUES).optional(),
  Interaction: z.enum(DIAGNOSTIC_LANGUAGE_LEVEL_VALUES).optional(),
});

const languageReasoningSchema = z.object({
  Fluency: z.string().trim().min(1).optional(),
  Grammar: z.string().trim().min(1).optional(),
  Range: z.string().trim().min(1).optional(),
  Coherence: z.string().trim().min(1).optional(),
  Interaction: z.string().trim().min(1).optional(),
});

function createDiagnosticQuestionResponseSchema() {
  return z.object({
    question_id: z.string().trim().min(1),
    question_text: z.string().trim().min(1).optional(),
    candidate_answer: z.string().trim().min(1).optional(),
    reframed_answer: z.string().trim().min(1).optional(),
    thinking_levels: thinkingLevelsSchema,
    confidence_levels: confidenceLevelsSchema,
    language_levels: languageLevelsSchema,
    reasoning: z.object({
      thinking: thinkingReasoningSchema,
      confidence: confidenceReasoningSchema,
      language: languageReasoningSchema,
    }),
  });
}

function createDiagnosticStoredReportSchema() {
  const diagnosticQuestionResponseSchema =
    createDiagnosticQuestionResponseSchema();

  return z.object({
    assessment_result: z.object({
      question_responses: z.array(diagnosticQuestionResponseSchema).min(1),
    }),
    education_summary: z.string().trim().min(1),
    aspiration_statement: z.string().trim().min(1),
    reality_statement: z.string().trim().min(1),
    strengths: z.array(z.string().trim().min(1)).min(1).max(5),
    improvement_areas: z.array(z.string().trim().min(1)).min(1).max(5),
  });
}

function createQuestionResponseVariant(question: DiagnosticQuestion) {
  return z.object({
    question_id: z.literal(question.id),
    question_text: z.string().trim().min(1).optional(),
    candidate_answer: z.string().trim().min(1).optional(),
    reframed_answer: z.string().trim().min(1).optional(),
    thinking_levels: thinkingLevelsSchema,
    confidence_levels: confidenceLevelsSchema,
    language_levels: languageLevelsSchema,
    reasoning: z.object({
      thinking: thinkingReasoningSchema,
      confidence: confidenceReasoningSchema,
      language: languageReasoningSchema,
    }),
  });
}

export function createDiagnosticReportGenerationSchema(
  questions: DiagnosticQuestion[],
) {
  if (!questions.length) {
    throw new Error("No retrieved questions available for report generation");
  }

  const variants = questions.map(createQuestionResponseVariant);
  const questionResponseSchema =
    variants.length === 1
      ? variants[0]
      : z.discriminatedUnion(
          "question_id",
          variants as [
            (typeof variants)[number],
            (typeof variants)[number],
            ...(typeof variants)[number][],
          ],
        );

  return z.object({
    assessment_result: z.object({
      question_responses: z.array(questionResponseSchema).min(1),
    }),
    education_summary: z.string().trim().min(1),
    aspiration_statement: z.string().trim().min(1),
    reality_statement: z.string().trim().min(1),
    strengths: z.array(z.string().trim().min(1)).min(1).max(5),
    improvement_areas: z.array(z.string().trim().min(1)).min(1).max(5),
  });
}

export function getDiagnosticSessionTranscriptMessages(
  transcript: unknown,
): DiagnosticTranscriptMessage[] {
  const transcriptValue =
    transcript && typeof transcript === "object" && !Array.isArray(transcript)
      ? (transcript as Record<string, unknown>)
      : null;

  if (!Array.isArray(transcriptValue?.turns)) {
    return [];
  }

  return (transcriptValue.turns as unknown[])
    .filter((turn): turn is Record<string, unknown> => {
      if (!turn || typeof turn !== "object") return false;
      const t = turn as Record<string, unknown>;
      return (
        typeof t.index === "number" &&
        typeof t.text === "string" &&
        typeof t.timestamp === "string" &&
        (t.role === "user" || t.role === "assistant" || t.role === "agent")
      );
    })
    .map((turn) => ({
      id: String(turn.index),
      participantIdentity: turn.role === "user" ? "user" : "agent",
      role: turn.role === "user" ? ("user" as const) : ("agent" as const),
      text: String(turn.text),
      timestamp: String(turn.timestamp),
    }))
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}

export function buildDiagnosticTranscriptPromptText(
  messages: DiagnosticTranscriptMessage[],
) {
  return messages
    .map((message) => {
      const speaker = message.role === "user" ? "USER" : "AGENT";
      return `[${message.timestamp}] ${speaker}: ${message.text}`;
    })
    .join("\n");
}

export function parseDiagnosticStoredReportJson(
  value: unknown,
): DiagnosticStoredReportJson {
  return createDiagnosticStoredReportSchema().parse(
    value,
  ) as DiagnosticStoredReportJson;
}
