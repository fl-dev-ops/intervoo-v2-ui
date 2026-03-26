import type {
  PreScreenQuestionnaireDraft as PrismaPreScreenQuestionnaireDraft,
  PreScreenSession as PrismaPreScreenSession,
} from "#/generated/prisma/client";
import type {
  PreScreenAgentContextDto,
  PreScreenQuestionnaireDraftDto,
  PreScreenSessionDto,
} from "./dto";
import type { PreScreenAnswerMap } from "./question-types";
import { PRE_SCREEN_AGENT_TYPE } from "./constants";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parsePreScreenAnswerMap(value: unknown): PreScreenAnswerMap {
  if (!isRecord(value)) {
    return {};
  }

  return value as PreScreenAnswerMap;
}

export function deriveLatestAgentContext(answers: PreScreenAnswerMap): PreScreenAgentContextDto {
  const studentName = getStringAnswer(answers.profile_name);
  const college = getStringAnswer(answers.profile_college);
  const degree = getStringAnswer(answers.profile_degree);
  const stream = getStringAnswer(answers.profile_stream);
  const year = getStringAnswer(answers.profile_year);

  const aiming = getStringAnswer(answers.job_aiming_role);
  const dream = getStringAnswer(answers.job_dream_role);
  const backup = getStringAnswer(answers.job_backup_role);

  const profileSummary = [year, degree, stream, college].filter(Boolean).join(" · ");

  const jobResearchSummary = [
    getStringAnswer(answers.research_companies),
    getStringAnswer(answers.research_skills_tools),
    getStringAnswer(answers.research_role_responsibilities),
    getStringAnswer(answers.research_salary_awareness),
    getStringAnswer(answers.research_jd_awareness),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    studentName,
    profileSummary: profileSummary || null,
    targetRoles: {
      aiming,
      dream,
      backup,
    },
    jobResearchSummary: jobResearchSummary || null,
  };
}

function getStringAnswer(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function toPreScreenSessionDto(session: PrismaPreScreenSession): PreScreenSessionDto {
  return {
    id: session.id,
    draftId: session.draftId,
    status: session.status,
    roomName: session.roomName ?? null,
    agentType: (session.agentType || PRE_SCREEN_AGENT_TYPE) as typeof PRE_SCREEN_AGENT_TYPE,
    egressId: session.egressId ?? null,
    audioUrl: session.audioUrl ?? null,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

export function toPreScreenQuestionnaireDraftDto(
  draft: PrismaPreScreenQuestionnaireDraft & {
    session?: PrismaPreScreenSession | null;
  },
): PreScreenQuestionnaireDraftDto {
  const answers = parsePreScreenAnswerMap(draft.answers);
  const latestAgentContext = isRecord(draft.latestAgentContext)
    ? (draft.latestAgentContext as unknown as PreScreenAgentContextDto)
    : null;

  return {
    id: draft.id,
    status: draft.status,
    currentStep: draft.currentStep as PreScreenQuestionnaireDraftDto["currentStep"],
    schemaVersion: draft.schemaVersion,
    questionSetKey: draft.questionSetKey,
    answers,
    latestAgentContext,
    session: draft.session ? toPreScreenSessionDto(draft.session) : null,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
    completedAt: draft.completedAt?.toISOString() ?? null,
  };
}
