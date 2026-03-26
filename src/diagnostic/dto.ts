import type { PreScreenAgentType } from "./constants";
import type {
  PreScreenAnswerMap,
  PreScreenAnswerValue,
  PreScreenQuestionId,
  PreScreenStepId,
} from "./question-types";

export type PreScreenSessionStatusDto = "STARTED" | "COMPLETED" | "REPORT_READY";

export interface PreScreenQuestionnaireDraftDto {
  id: string;
  status: PreScreenSessionStatusDto;
  currentStep: PreScreenStepId;
  schemaVersion: number;
  questionSetKey: string;
  answers: PreScreenAnswerMap;
  latestAgentContext: PreScreenAgentContextDto | null;
  session: PreScreenSessionDto | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface PreScreenSessionDto {
  id: string;
  draftId: string;
  status: PreScreenSessionStatusDto;
  roomName: string | null;
  agentType: PreScreenAgentType;
  egressId: string | null;
  audioUrl: string | null;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PreScreenAgentContextDto {
  studentName: string | null;
  profileSummary: string | null;
  targetRoles: {
    aiming: string | null;
    dream: string | null;
    backup: string | null;
  };
  jobResearchSummary: string | null;
}

export interface GetOrCreatePreScreenDraftRequestDto {
  draftId?: string;
}

export interface GetOrCreatePreScreenDraftResponseDto {
  draft: PreScreenQuestionnaireDraftDto;
}

export interface SavePreScreenAnswerRequestDto {
  draftId: string;
  stepId: PreScreenStepId;
  questionId: PreScreenQuestionId;
  value: PreScreenAnswerValue;
}

export interface SavePreScreenAnswerResponseDto {
  draft: PreScreenQuestionnaireDraftDto;
}

export interface SavePreScreenStepRequestDto {
  draftId: string;
  stepId: PreScreenStepId;
}

export interface SavePreScreenStepResponseDto {
  draft: PreScreenQuestionnaireDraftDto;
}

export interface StartPreScreenSessionRequestDto {
  draftId: string;
}

export interface StartPreScreenSessionResponseDto {
  draft: PreScreenQuestionnaireDraftDto;
  session: PreScreenSessionDto;
  livekit: {
    serverUrl: string;
    roomName: string;
    participantToken: string;
    egressId: string;
  };
}

export interface CompletePreScreenSessionRequestDto {
  draftId: string;
  sessionId: string;
  transcript?: unknown;
  transcriptSummary?: unknown;
  sessionMetadata?: unknown;
}

export interface CompletePreScreenSessionResponseDto {
  draft: PreScreenQuestionnaireDraftDto;
  session: PreScreenSessionDto;
}
