import { z } from "zod";

export const DIAGNOSTIC_THINKING_LEVEL_VALUES = [
  "TF1",
  "TF2",
  "TF3",
  "TF4",
  "TF5",
] as const;

export const DIAGNOSTIC_CONFIDENCE_LEVEL_VALUES = [
  "VCP1",
  "VCP2",
  "VCP3",
  "VCP4",
] as const;

export const DIAGNOSTIC_LANGUAGE_LEVEL_VALUES = [
  "Pre-A1",
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
] as const;

export const DIAGNOSTIC_LANGUAGE_DIMENSIONS = [
  "Fluency",
  "Grammar",
  "Range",
  "Coherence",
  "Interaction",
] as const;

export type DiagnosticThinkingLevel =
  (typeof DIAGNOSTIC_THINKING_LEVEL_VALUES)[number];
export type DiagnosticConfidenceLevel =
  (typeof DIAGNOSTIC_CONFIDENCE_LEVEL_VALUES)[number];
export type DiagnosticLanguageLevel =
  (typeof DIAGNOSTIC_LANGUAGE_LEVEL_VALUES)[number];
export type DiagnosticLanguageDimension =
  (typeof DIAGNOSTIC_LANGUAGE_DIMENSIONS)[number];

export const languageLevelsSchema = z.object({
  Fluency: z.enum(DIAGNOSTIC_LANGUAGE_LEVEL_VALUES),
  Grammar: z.enum(DIAGNOSTIC_LANGUAGE_LEVEL_VALUES),
  Range: z.enum(DIAGNOSTIC_LANGUAGE_LEVEL_VALUES),
  Coherence: z.enum(DIAGNOSTIC_LANGUAGE_LEVEL_VALUES),
  Interaction: z.enum(DIAGNOSTIC_LANGUAGE_LEVEL_VALUES),
});

export const languageReasoningSchema = z.object({
  Fluency: z.string().trim().min(1),
  Grammar: z.string().trim().min(1),
  Range: z.string().trim().min(1),
  Coherence: z.string().trim().min(1),
  Interaction: z.string().trim().min(1),
});

export const diagnosticsReportSchema = z.object({
  assessment_result: z.object({
    thinking_level: z.enum(DIAGNOSTIC_THINKING_LEVEL_VALUES),
    confidence_level: z.enum(DIAGNOSTIC_CONFIDENCE_LEVEL_VALUES),
    language_levels: languageLevelsSchema,
    thinking_reasoning: z.string().trim().min(1),
    confidence_reasoning: z.string().trim().min(1),
    language_reasoning: languageReasoningSchema,
  }),
  education_summary: z.string().trim().min(1),
  aspiration_statement: z.string().trim().min(1),
  reality_statement: z.string().trim().min(1),
  strengths: z.array(z.string().trim().min(1)).min(1).max(5),
  improvement_areas: z.array(z.string().trim().min(1)).min(1).max(5),
});

export type DiagnosticsReport = z.infer<typeof diagnosticsReportSchema>;

export type DiagnosticsHydratedAssessmentResult = {
  total_score: number;
  thinking_avg: number;
  confidence_avg: number;
  language_avg: number;
  salary_lpa: number;
  salary_band: string;
  salary_percentile: number;
  thinking_level: DiagnosticThinkingLevel;
  confidence_level: DiagnosticConfidenceLevel;
  language_levels: Record<DiagnosticLanguageDimension, DiagnosticLanguageLevel>;
  thinking_reasoning: string;
  confidence_reasoning: string;
  language_reasoning: Record<DiagnosticLanguageDimension, string>;
};

export type DiagnosticsHydratedReport = {
  assessment_result: DiagnosticsHydratedAssessmentResult;
  education_summary: string;
  aspiration_statement: string;
  reality_statement: string;
  strengths: string[];
  improvement_areas: string[];
};
