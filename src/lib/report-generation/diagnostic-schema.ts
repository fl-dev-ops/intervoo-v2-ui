import { z } from "zod";
import type {
  DiagnosticQuestion,
  DiagnosticQuestionType,
} from "./diagnostic-activity";
import {
  DIAGNOSTIC_CONFIDENCE_LEVEL_VALUES,
  DIAGNOSTIC_LANGUAGE_LEVEL_VALUES,
  DIAGNOSTIC_THINKING_LEVEL_VALUES,
  type DiagnosticConfidenceDimension,
  type DiagnosticConfidenceLevel,
  type DiagnosticLanguageLevel,
  type DiagnosticStoredReportJson,
  type DiagnosticThinkingDimension,
  type DiagnosticThinkingLevel,
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
      thinking_levels: thinkingLevelsSchema.optional(),
      confidence_levels: confidenceLevelsSchema.optional(),
      language_levels: languageLevelsSchema.optional(),
      reasoning: z.object({
        thinking: thinkingReasoningSchema.optional(),
        confidence: confidenceReasoningSchema.optional(),
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
        if (!value.thinking_levels) {
          context.addIssue({
            code: "custom",
            message: "thinking_levels is required for Thinking questions",
            path: ["thinking_levels"],
          });
          return;
        }

        const thinkingEntries = Object.entries(value.thinking_levels).filter(
          ([, level]) => Boolean(level),
        ) as Array<[DiagnosticThinkingDimension, DiagnosticThinkingLevel]>;

        if (!thinkingEntries.length) {
          context.addIssue({
            code: "custom",
            message:
              "thinking_levels must include at least one dimension for Thinking questions",
            path: ["thinking_levels"],
          });
          return;
        }

        if (!value.reasoning.thinking) {
          context.addIssue({
            code: "custom",
            message: "reasoning.thinking is required for Thinking questions",
            path: ["reasoning", "thinking"],
          });
          return;
        }

        for (const [dimension] of thinkingEntries) {
          const reason = value.reasoning.thinking[dimension];
          if (!reason?.trim()) {
            context.addIssue({
              code: "custom",
              message: `reasoning.thinking.${dimension} is required when thinking_levels.${dimension} is set`,
              path: ["reasoning", "thinking", dimension],
            });
          }
        }

        const thinkingReasonEntries = Object.entries(
          value.reasoning.thinking,
        ).filter(([, reason]) => Boolean(reason)) as Array<
          [DiagnosticThinkingDimension, string]
        >;

        for (const [dimension] of thinkingReasonEntries) {
          const level = value.thinking_levels[dimension];
          if (!level) {
            context.addIssue({
              code: "custom",
              message: `reasoning.thinking.${dimension} must be omitted when thinking_levels.${dimension} is omitted`,
              path: ["reasoning", "thinking", dimension],
            });
          }
        }
      } else {
        if (value.thinking_levels !== undefined) {
          context.addIssue({
            code: "custom",
            message:
              "thinking_levels must be omitted for non-Thinking questions",
            path: ["thinking_levels"],
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
        if (!value.confidence_levels) {
          context.addIssue({
            code: "custom",
            message: "confidence_levels is required for Confidence questions",
            path: ["confidence_levels"],
          });
          return;
        }

        const confidenceEntries = Object.entries(
          value.confidence_levels,
        ).filter(([, level]) => Boolean(level)) as Array<
          [DiagnosticConfidenceDimension, DiagnosticConfidenceLevel]
        >;

        if (!confidenceEntries.length) {
          context.addIssue({
            code: "custom",
            message:
              "confidence_levels must include at least one dimension for Confidence questions",
            path: ["confidence_levels"],
          });
          return;
        }

        if (!value.reasoning.confidence) {
          context.addIssue({
            code: "custom",
            message:
              "reasoning.confidence is required for Confidence questions",
            path: ["reasoning", "confidence"],
          });
          return;
        }

        for (const [dimension] of confidenceEntries) {
          const reason = value.reasoning.confidence[dimension];
          if (!reason?.trim()) {
            context.addIssue({
              code: "custom",
              message: `reasoning.confidence.${dimension} is required when confidence_levels.${dimension} is set`,
              path: ["reasoning", "confidence", dimension],
            });
          }
        }

        const confidenceReasonEntries = Object.entries(
          value.reasoning.confidence,
        ).filter(([, reason]) => Boolean(reason)) as Array<
          [DiagnosticConfidenceDimension, string]
        >;

        for (const [dimension] of confidenceReasonEntries) {
          const level = value.confidence_levels[dimension];
          if (!level) {
            context.addIssue({
              code: "custom",
              message: `reasoning.confidence.${dimension} must be omitted when confidence_levels.${dimension} is omitted`,
              path: ["reasoning", "confidence", dimension],
            });
          }
        }
      } else {
        if (value.confidence_levels !== undefined) {
          context.addIssue({
            code: "custom",
            message:
              "confidence_levels must be omitted for non-Confidence questions",
            path: ["confidence_levels"],
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
      ) as Array<[keyof typeof value.language_levels, DiagnosticLanguageLevel]>;

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
    shape.thinking = thinkingReasoningSchema;
  }
  if (types.includes("Confidence")) {
    shape.confidence = confidenceReasoningSchema;
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
    shape.thinking_levels = thinkingLevelsSchema;
  }
  if (types.includes("Confidence")) {
    shape.confidence_levels = confidenceLevelsSchema;
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
  questions: DiagnosticQuestion[],
): DiagnosticStoredReportJson {
  return createDiagnosticStoredReportSchema(questions).parse(
    value,
  ) as DiagnosticStoredReportJson;
}
