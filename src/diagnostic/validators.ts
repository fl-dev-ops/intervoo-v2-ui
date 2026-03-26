import { z } from "zod";
import { PRE_SCREEN_QUESTION_IDS, PRE_SCREEN_STEP_IDS } from "./question-types";

const jsonRecordSchema: z.ZodType<Record<string, unknown>> = z.record(z.string(), z.unknown());

export const preScreenStepIdSchema = z.enum(PRE_SCREEN_STEP_IDS);
export const preScreenQuestionIdSchema = z.enum(PRE_SCREEN_QUESTION_IDS);
export const preScreenSessionStatusSchema = z.enum(["STARTED", "COMPLETED", "REPORT_READY"]);

export const preScreenAnswerValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.string()),
  jsonRecordSchema,
]);

export const getOrCreatePreScreenDraftInputSchema = z.object({
  draftId: z.string().min(1).optional(),
});

export const savePreScreenAnswerInputSchema = z.object({
  draftId: z.string().min(1),
  stepId: preScreenStepIdSchema,
  questionId: preScreenQuestionIdSchema,
  value: preScreenAnswerValueSchema,
});

export const savePreScreenStepInputSchema = z.object({
  draftId: z.string().min(1),
  stepId: preScreenStepIdSchema,
});

export const startPreScreenSessionInputSchema = z.object({
  draftId: z.string().min(1),
});

export const completePreScreenSessionInputSchema = z.object({
  draftId: z.string().min(1),
  sessionId: z.string().min(1),
  transcript: z.unknown().optional(),
  transcriptSummary: z.unknown().optional(),
  sessionMetadata: z.unknown().optional(),
});
