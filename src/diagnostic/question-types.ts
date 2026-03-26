export const PRE_SCREEN_STEP_IDS = [
  "intro",
  "profile_name",
  "profile_college",
  "profile_degree",
  "profile_stream",
  "profile_year",
  "job_aiming_role",
  "job_dream_role",
  "job_backup_role",
  "job_why_aiming",
  "job_why_dream",
  "job_why_backup",
  "research_companies",
  "research_seniors",
  "research_skills_tools",
  "research_role_responsibilities",
  "research_salary_awareness",
  "research_jd_awareness",
  "review",
  "permissions",
  "session",
  "complete",
] as const;

export type PreScreenStepId = (typeof PRE_SCREEN_STEP_IDS)[number];

export const PRE_SCREEN_QUESTION_IDS = [
  "profile_name",
  "profile_college",
  "profile_degree",
  "profile_stream",
  "profile_year",
  "job_aiming_role",
  "job_dream_role",
  "job_backup_role",
  "job_why_aiming",
  "job_why_dream",
  "job_why_backup",
  "research_companies",
  "research_seniors",
  "research_skills_tools",
  "research_role_responsibilities",
  "research_salary_awareness",
  "research_jd_awareness",
] as const;

export type PreScreenQuestionId = (typeof PRE_SCREEN_QUESTION_IDS)[number];

export const PRE_SCREEN_SECTION_IDS = [
  "profile",
  "job_plans",
  "job_research",
  "review",
  "permissions",
  "session",
  "complete",
] as const;

export type PreScreenSectionId = (typeof PRE_SCREEN_SECTION_IDS)[number];

export const PRE_SCREEN_INPUT_TYPES = ["text", "textarea", "select", "chips"] as const;

export type PreScreenInputType = (typeof PRE_SCREEN_INPUT_TYPES)[number];

export type PreScreenAnswerValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | Record<string, unknown>;

export type PreScreenAnswerMap = Partial<Record<PreScreenQuestionId, PreScreenAnswerValue>>;

export interface PreScreenQuestionConfig {
  id: PreScreenQuestionId;
  stepId: PreScreenQuestionId;
  section: Extract<PreScreenSectionId, "profile" | "job_plans" | "job_research">;
  field: PreScreenQuestionId;
  inputType: PreScreenInputType;
  title: string;
  prompt: string;
  helpText?: string;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  isVisible?: (answers: PreScreenAnswerMap) => boolean;
  showInReview?: boolean;
  agentContextLabel: string;
}
