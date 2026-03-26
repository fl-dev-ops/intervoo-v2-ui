import {
  PRE_SCREEN_QUESTION_IDS,
  type PreScreenQuestionId,
  type PreScreenStepId,
} from "./question-types";

export const PRE_SCREEN_FLOW_STEPS: PreScreenStepId[] = [
  "intro",
  ...PRE_SCREEN_QUESTION_IDS,
  "review",
  "permissions",
  "session",
  "complete",
];

export const PRE_SCREEN_FLOW_SECTIONS = [
  { id: "profile", label: "Profile", stepIds: PRE_SCREEN_QUESTION_IDS.slice(0, 5) },
  { id: "job_plans", label: "Job Plans", stepIds: PRE_SCREEN_QUESTION_IDS.slice(5, 11) },
  { id: "job_research", label: "Job Research", stepIds: PRE_SCREEN_QUESTION_IDS.slice(11) },
  { id: "review", label: "Review", stepIds: ["review"] },
  { id: "session", label: "Pre-screen", stepIds: ["permissions", "session", "complete"] },
] as const;

const stepIndexById = new Map(
  PRE_SCREEN_FLOW_STEPS.map((stepId, index) => [stepId, index] as const),
);

export function getPreScreenStepIndex(stepId: PreScreenStepId) {
  return stepIndexById.get(stepId) ?? 0;
}

export function getNextPreScreenStep(stepId: PreScreenStepId): PreScreenStepId | null {
  const index = getPreScreenStepIndex(stepId);
  return PRE_SCREEN_FLOW_STEPS[index + 1] ?? null;
}

export function getPreviousPreScreenStep(stepId: PreScreenStepId): PreScreenStepId | null {
  const index = getPreScreenStepIndex(stepId);
  return PRE_SCREEN_FLOW_STEPS[index - 1] ?? null;
}

export function isPreScreenQuestionStep(stepId: PreScreenStepId): stepId is PreScreenQuestionId {
  return PRE_SCREEN_QUESTION_IDS.includes(stepId as PreScreenQuestionId);
}

export function getPreScreenQuestionProgress(stepId: PreScreenStepId) {
  if (!isPreScreenQuestionStep(stepId)) {
    return 0;
  }

  return PRE_SCREEN_QUESTION_IDS.indexOf(stepId) + 1;
}

export function getPreScreenStageIndex(stepId: PreScreenStepId) {
  if (stepId === "intro") return 0;
  if (PRE_SCREEN_QUESTION_IDS.slice(0, 5).includes(stepId as PreScreenQuestionId)) return 0;
  if (PRE_SCREEN_QUESTION_IDS.slice(5, 11).includes(stepId as PreScreenQuestionId)) return 1;
  if (PRE_SCREEN_QUESTION_IDS.slice(11).includes(stepId as PreScreenQuestionId)) return 2;
  if (stepId === "review") return 3;
  return 4;
}
