export type DiagnosticQuestionType = "Language" | "Thinking" | "Confidence";

export interface DiagnosticQuestion {
  id: string;
  text: string;
  question_type: DiagnosticQuestionType[];
  category?: string;
  difficulty_level?: string;
  band?: number;
}
