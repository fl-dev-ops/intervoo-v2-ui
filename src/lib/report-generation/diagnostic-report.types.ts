export type DiagnosticTranscriptRole = "user" | "agent";

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

export const DIAGNOSTIC_THINKING_DIMENSIONS = [
  "Relevance",
  "Specificity",
  "Reasoning",
  "JobCompetency",
] as const;

export const DIAGNOSTIC_CONFIDENCE_DIMENSIONS = [
  "Volume",
  "Pace",
  "Pause",
  "Latency",
] as const;

export interface DiagnosticTranscriptMessage {
  id: string;
  participantIdentity: string;
  role: DiagnosticTranscriptRole;
  text: string;
  timestamp: string;
}

export interface DiagnosticSessionTranscript {
  source: "livekit_client_transcriptions";
  updatedAt: string;
  participantName?: string;
  messages: DiagnosticTranscriptMessage[];
}

export type DiagnosticThinkingLevel =
  (typeof DIAGNOSTIC_THINKING_LEVEL_VALUES)[number];
export type DiagnosticConfidenceLevel =
  (typeof DIAGNOSTIC_CONFIDENCE_LEVEL_VALUES)[number];
export type DiagnosticLanguageLevel =
  (typeof DIAGNOSTIC_LANGUAGE_LEVEL_VALUES)[number];
export type DiagnosticLanguageDimension =
  (typeof DIAGNOSTIC_LANGUAGE_DIMENSIONS)[number];
export type DiagnosticThinkingDimension =
  (typeof DIAGNOSTIC_THINKING_DIMENSIONS)[number];
export type DiagnosticConfidenceDimension =
  (typeof DIAGNOSTIC_CONFIDENCE_DIMENSIONS)[number];

export interface DiagnosticQuestionReasoning {
  thinking?: Partial<Record<DiagnosticThinkingDimension, string>>;
  confidence?: Partial<Record<DiagnosticConfidenceDimension, string>>;
  language?: Partial<Record<DiagnosticLanguageDimension, string>>;
}

export interface DiagnosticQuestionResponse {
  question_id: string;
  thinking_levels?: Partial<
    Record<DiagnosticThinkingDimension, DiagnosticThinkingLevel>
  >;
  confidence_levels?: Partial<
    Record<DiagnosticConfidenceDimension, DiagnosticConfidenceLevel>
  >;
  language_levels?: Partial<
    Record<DiagnosticLanguageDimension, DiagnosticLanguageLevel>
  >;
  reasoning: DiagnosticQuestionReasoning;
}

export interface DiagnosticStoredAssessmentResult {
  question_responses: DiagnosticQuestionResponse[];
}

export type SalaryBandLabel = "₹3.5-15 LPA" | "₹15-35 LPA" | "₹35+ LPA";

export interface DiagnosticAssessmentResult {
  total_score: number;
  thinking_avg: number;
  confidence_avg: number;
  language_avg: number;
  salary_lpa: number;
  salary_band: SalaryBandLabel;
  salary_percentile: number;
  question_responses: DiagnosticQuestionResponse[];
}

export interface DiagnosticReportBase<TAssessment> {
  assessment_result: TAssessment;
  education_summary: string;
  aspiration_statement: string;
  reality_statement: string;
  strengths: string[];
  improvement_areas: string[];
}

export type DiagnosticStoredReportJson =
  DiagnosticReportBase<DiagnosticStoredAssessmentResult>;

export type DiagnosticReportJson =
  DiagnosticReportBase<DiagnosticAssessmentResult>;

export interface DiagnosticReportMetadata {
  scoring: DiagnosticAssessmentResult;
  hydratedReport: DiagnosticReportJson;
  generatedAt: string;
  model: string;
}

export interface DiagnosticQuestion {
  id: string;
  text: string;
  question_type: DiagnosticQuestionType[];
  category?: string;
  difficulty_level?: string;
  band?: number;
}

export type DiagnosticQuestionType = "Language" | "Thinking" | "Confidence";
