import { z } from "zod";
import type { DiagnosticQuestion, DiagnosticQuestionType } from "./diagnostic-activity";
import {
  DIAGNOSTIC_CONFIDENCE_LEVEL_VALUES,
  DIAGNOSTIC_LANGUAGE_LEVEL_VALUES,
  DIAGNOSTIC_THINKING_LEVEL_VALUES,
  type DiagnosticLanguageLevel,
  type DiagnosticStoredReportJson,
  type DiagnosticTranscriptMessage,
} from "./diagnostic-report.types";

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

export function createQuestionTypeMap(
  questions: DiagnosticQuestion[],
): Map<string, DiagnosticQuestionType[]> {
  return new Map(
    questions.map((question) => [question.id, question.question_type]),
  );
}

function createDiagnosticQuestionResponseSchema(
  questionTypeById: Map<string, DiagnosticQuestionType[]>,
) {
  return z
    .object({
      question_id: z.string().trim().min(1),
      thinking_level: z.enum(DIAGNOSTIC_THINKING_LEVEL_VALUES).optional(),
      confidence_level: z
        .enum(DIAGNOSTIC_CONFIDENCE_LEVEL_VALUES)
        .optional(),
      language_levels: languageLevelsSchema.optional(),
      reasoning: z.object({
        thinking: z.string().trim().min(1).optional(),
        confidence: z.string().trim().min(1).optional(),
        language: languageReasoningSchema.optional(),
      }),
    })
    .superRefine((value, context) => {
      const questionTypes = questionTypeById.get(value.question_id);
      if (!questionTypes) {
        context.addIssue({
          code: "custom",
          message: `Unknown question_id: ${value.question_id}`,
          path: ["question_id"],
        });
        return;
      }

      const hasThinking = questionTypes.includes("Thinking");
      const hasConfidence = questionTypes.includes("Confidence");
      const hasLanguage = questionTypes.includes("Language");

      if (hasThinking) {
        if (!value.thinking_level) {
          context.addIssue({
            code: "custom",
            message: "thinking_level is required for Thinking questions",
            path: ["thinking_level"],
          });
        }
        if (!value.reasoning.thinking?.trim()) {
          context.addIssue({
            code: "custom",
            message: "reasoning.thinking is required for Thinking questions",
            path: ["reasoning", "thinking"],
          });
        }
      } else {
        if (value.thinking_level !== undefined) {
          context.addIssue({
            code: "custom",
            message:
              "thinking_level must be omitted for non-Thinking questions",
            path: ["thinking_level"],
          });
        }
        if (value.reasoning.thinking !== undefined) {
          context.addIssue({
            code: "custom",
            message:
              "reasoning.thinking must be omitted for non-Thinking questions",
            path: ["reasoning", "thinking"],
          });
        }
      }

      if (hasConfidence) {
        if (!value.confidence_level) {
          context.addIssue({
            code: "custom",
            message: "confidence_level is required for Confidence questions",
            path: ["confidence_level"],
          });
        }
        if (!value.reasoning.confidence?.trim()) {
          context.addIssue({
            code: "custom",
            message:
              "reasoning.confidence is required for Confidence questions",
            path: ["reasoning", "confidence"],
          });
        }
      } else {
        if (value.confidence_level !== undefined) {
          context.addIssue({
            code: "custom",
            message:
              "confidence_level must be omitted for non-Confidence questions",
            path: ["confidence_level"],
          });
        }
        if (value.reasoning.confidence !== undefined) {
          context.addIssue({
            code: "custom",
            message:
              "reasoning.confidence must be omitted for non-Confidence questions",
            path: ["reasoning", "confidence"],
          });
        }
      }

      if (!hasLanguage) {
        if (value.language_levels !== undefined) {
          context.addIssue({
            code: "custom",
            message:
              "language_levels must be omitted for non-Language questions",
            path: ["language_levels"],
          });
        }
        if (value.reasoning.language !== undefined) {
          context.addIssue({
            code: "custom",
            message:
              "reasoning.language must be omitted for non-Language questions",
            path: ["reasoning", "language"],
          });
        }
        return;
      }

      if (!value.language_levels) {
        context.addIssue({
          code: "custom",
          message: "language_levels is required for Language questions",
          path: ["language_levels"],
        });
        return;
      }

      const languageEntries = Object.entries(value.language_levels).filter(
        ([, level]) => Boolean(level),
      ) as Array<
        [keyof typeof value.language_levels, DiagnosticLanguageLevel]
      >;

      if (!languageEntries.length) {
        context.addIssue({
          code: "custom",
          message:
            "language_levels must include at least one dimension for Language questions",
          path: ["language_levels"],
        });
        return;
      }

      if (!value.reasoning.language) {
        context.addIssue({
          code: "custom",
          message: "reasoning.language is required for Language questions",
          path: ["reasoning", "language"],
        });
        return;
      }

      for (const [dimension] of languageEntries) {
        const reason = value.reasoning.language[dimension];
        if (!reason?.trim()) {
          context.addIssue({
            code: "custom",
            message: `reasoning.language.${dimension} is required when language_levels.${dimension} is set`,
            path: ["reasoning", "language", dimension],
          });
        }
      }

      const languageReasonEntries = Object.entries(
        value.reasoning.language,
      ).filter(([, reason]) => Boolean(reason)) as Array<
        [keyof typeof value.reasoning.language, string]
      >;

      for (const [dimension] of languageReasonEntries) {
        const level = value.language_levels[dimension];
        if (!level) {
          context.addIssue({
            code: "custom",
            message: `reasoning.language.${dimension} must be omitted when language_levels.${dimension} is omitted`,
            path: ["reasoning", "language", dimension],
          });
        }
      }
    });
}

function createDiagnosticStoredReportSchema(questions: DiagnosticQuestion[]) {
  const questionTypeById = createQuestionTypeMap(questions);
  const diagnosticQuestionResponseSchema =
    createDiagnosticQuestionResponseSchema(questionTypeById);

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

function createReasoningSchemaForTypes(types: DiagnosticQuestionType[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  if (types.includes("Thinking")) {
    shape.thinking = z.string().trim().min(1);
  }
  if (types.includes("Confidence")) {
    shape.confidence = z.string().trim().min(1);
  }
  if (types.includes("Language")) {
    shape.language = languageReasoningSchema;
  }
  return z.object(shape);
}

function createQuestionResponseVariant(question: DiagnosticQuestion) {
  const types = question.question_type;
  const shape: Record<string, z.ZodTypeAny> = {
    question_id: z.literal(question.id),
    reasoning: createReasoningSchemaForTypes(types),
  };
  if (types.includes("Thinking")) {
    shape.thinking_level = z.enum(DIAGNOSTIC_THINKING_LEVEL_VALUES);
  }
  if (types.includes("Confidence")) {
    shape.confidence_level = z.enum(DIAGNOSTIC_CONFIDENCE_LEVEL_VALUES);
  }
  if (types.includes("Language")) {
    shape.language_levels = languageLevelsSchema;
  }
  return z.object(shape);
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
      role:
        turn.role === "user"
          ? ("user" as const)
          : ("agent" as const),
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
  questions: DiagnosticQuestion[],
): DiagnosticStoredReportJson {
  return createDiagnosticStoredReportSchema(questions).parse(
    value,
  ) as DiagnosticStoredReportJson;
}
