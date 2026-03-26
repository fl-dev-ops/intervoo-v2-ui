import { TRPCError } from "@trpc/server";
import { prisma } from "#/db";
import { Prisma } from "#/generated/prisma/client";
import {
  PRE_SCREEN_AGENT_TYPE,
  PRE_SCREEN_DEFAULT_STEP,
  PRE_SCREEN_QUESTION_SET_KEY,
  PRE_SCREEN_SCHEMA_VERSION,
} from "./constants";
import {
  buildPreScreenParticipantIdentity,
  buildPreScreenRoomName,
  createPreScreenLiveKitRoom,
  createPreScreenLiveKitToken,
  getPreScreenLiveKitServerUrl,
  startPreScreenRoomRecording,
} from "./livekit";
import {
  deriveLatestAgentContext,
  parsePreScreenAnswerMap,
  toPreScreenQuestionnaireDraftDto,
  toPreScreenSessionDto,
} from "./mappers";
import type {
  CompletePreScreenSessionResponseDto,
  GetOrCreatePreScreenDraftResponseDto,
  PreScreenQuestionnaireDraftDto,
  SavePreScreenAnswerResponseDto,
  SavePreScreenStepResponseDto,
  StartPreScreenSessionResponseDto,
} from "./dto";
import type {
  PreScreenAnswerMap,
  PreScreenAnswerValue,
  PreScreenQuestionId,
  PreScreenStepId,
} from "./question-types";

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toLoggableError(error: unknown) {
  if (error instanceof Error) {
    const base = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } as Record<string, unknown>;

    for (const key of Object.getOwnPropertyNames(error)) {
      if (!(key in base)) {
        base[key] = (error as unknown as Record<string, unknown>)[key];
      }
    }

    return base;
  }

  return {
    message: typeof error === "string" ? error : "Unknown error",
    raw: error,
  };
}

async function getDraftRecordOrThrow(draftId: string) {
  const draft = await prisma.preScreenQuestionnaireDraft.findUnique({
    where: { id: draftId },
    include: { session: true },
  });

  if (!draft) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Pre-screen questionnaire draft not found",
    });
  }

  return draft;
}

function mergeAnswer(
  answers: PreScreenAnswerMap,
  questionId: PreScreenQuestionId,
  value: PreScreenAnswerValue,
) {
  return {
    ...answers,
    [questionId]: value,
  } satisfies PreScreenAnswerMap;
}

function buildSessionMetadata(input: {
  draftId: string;
  roomName: string;
  latestAgentContext: ReturnType<typeof deriveLatestAgentContext>;
}) {
  return {
    draftId: input.draftId,
    agentType: PRE_SCREEN_AGENT_TYPE,
    livekit: {
      roomName: input.roomName,
    },
    draftSnapshot: {
      questionSetKey: PRE_SCREEN_QUESTION_SET_KEY,
      schemaVersion: PRE_SCREEN_SCHEMA_VERSION,
    },
    latestAgentContext: input.latestAgentContext,
  };
}

export async function getOrCreatePreScreenDraft(
  draftId?: string,
): Promise<GetOrCreatePreScreenDraftResponseDto> {
  if (draftId) {
    const existing = await prisma.preScreenQuestionnaireDraft.findUnique({
      where: { id: draftId },
      include: { session: true },
    });

    if (existing) {
      return { draft: toPreScreenQuestionnaireDraftDto(existing) };
    }
  }

  const created = await prisma.preScreenQuestionnaireDraft.create({
    data: {
      currentStep: PRE_SCREEN_DEFAULT_STEP,
      schemaVersion: PRE_SCREEN_SCHEMA_VERSION,
      questionSetKey: PRE_SCREEN_QUESTION_SET_KEY,
      answers: toInputJsonValue({}),
    },
    include: { session: true },
  });

  return { draft: toPreScreenQuestionnaireDraftDto(created) };
}

export async function savePreScreenAnswer(input: {
  draftId: string;
  stepId: PreScreenStepId;
  questionId: PreScreenQuestionId;
  value: PreScreenAnswerValue;
}): Promise<SavePreScreenAnswerResponseDto> {
  const draft = await getDraftRecordOrThrow(input.draftId);
  const answers = parsePreScreenAnswerMap(draft.answers);
  const nextAnswers = mergeAnswer(answers, input.questionId, input.value);
  const latestAgentContext = deriveLatestAgentContext(nextAnswers);

  const updated = await prisma.preScreenQuestionnaireDraft.update({
    where: { id: draft.id },
    data: {
      answers: toInputJsonValue(nextAnswers),
      latestAgentContext: toInputJsonValue(latestAgentContext),
      currentStep: input.stepId,
    },
    include: { session: true },
  });

  return { draft: toPreScreenQuestionnaireDraftDto(updated) };
}

export async function savePreScreenStep(input: {
  draftId: string;
  stepId: PreScreenStepId;
}): Promise<SavePreScreenStepResponseDto> {
  await getDraftRecordOrThrow(input.draftId);

  const updated = await prisma.preScreenQuestionnaireDraft.update({
    where: { id: input.draftId },
    data: {
      currentStep: input.stepId,
    },
    include: { session: true },
  });

  return { draft: toPreScreenQuestionnaireDraftDto(updated) };
}

export async function startPreScreenSession(input: {
  draftId: string;
}): Promise<StartPreScreenSessionResponseDto> {
  console.info("[pre-screen session] start requested", {
    draftId: input.draftId,
  });

  const draft = await getDraftRecordOrThrow(input.draftId);
  const answers = parsePreScreenAnswerMap(draft.answers);
  const latestAgentContext = deriveLatestAgentContext(answers);
  const roomName = buildPreScreenRoomName(draft.id);
  const participantIdentity = buildPreScreenParticipantIdentity(draft.id);
  const participantName = latestAgentContext.studentName ?? "Pre-screen Student";
  const serverUrl = getPreScreenLiveKitServerUrl();
  const participantToken = await createPreScreenLiveKitToken({
    roomName,
    participantIdentity,
    participantName,
  });

  const sessionMetadata = buildSessionMetadata({
    draftId: draft.id,
    roomName,
    latestAgentContext,
  });

  console.info("[pre-screen session] draft resolved", {
    draftId: draft.id,
    roomName,
    participantIdentity,
    participantName,
    serverUrl,
  });

  const session = await prisma.preScreenSession.upsert({
    where: { draftId: draft.id },
    create: {
      draftId: draft.id,
      status: "STARTED",
      roomName,
      agentType: PRE_SCREEN_AGENT_TYPE,
      startedAt: new Date(),
      egressId: null,
      audioUrl: null,
      sessionMetadata: toInputJsonValue(sessionMetadata),
    },
    update: {
      status: "STARTED",
      roomName,
      agentType: PRE_SCREEN_AGENT_TYPE,
      startedAt: new Date(),
      endedAt: null,
      egressId: null,
      audioUrl: null,
      transcript: Prisma.DbNull,
      transcriptSummary: Prisma.DbNull,
      sessionMetadata: toInputJsonValue(sessionMetadata),
    },
  });

  try {
    await createPreScreenLiveKitRoom({
      roomName,
      metadata: {
        draftId: draft.id,
        sessionId: session.id,
        agentType: PRE_SCREEN_AGENT_TYPE,
        latestAgentContext,
      },
    });
  } catch (error) {
    await prisma.preScreenSession.update({
      where: { id: session.id },
      data: {
        sessionMetadata: toInputJsonValue({
          ...sessionMetadata,
          roomCreateError: error instanceof Error ? error.message : "Unknown room creation error",
        }),
      },
    });

    console.error("[pre-screen session] room creation failed", {
      draftId: draft.id,
      sessionId: session.id,
      roomName,
      error: toLoggableError(error),
    });

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create LiveKit room",
      cause: error,
    });
  }

  let egressId: string;

  try {
    const recording = await startPreScreenRoomRecording({
      roomName,
      sessionId: session.id,
    });

    egressId = recording.egressId;
  } catch (error) {
    await prisma.preScreenSession.update({
      where: { id: session.id },
      data: {
        sessionMetadata: toInputJsonValue({
          ...sessionMetadata,
          egressStartError: error instanceof Error ? error.message : "Unknown egress error",
        }),
      },
    });

    console.error("[pre-screen session] egress start failed", {
      draftId: draft.id,
      sessionId: session.id,
      roomName,
      error: toLoggableError(error),
    });

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to start LiveKit egress recording",
      cause: error,
    });
  }

  const recordedSession = await prisma.preScreenSession.update({
    where: { id: session.id },
    data: {
      egressId,
      sessionMetadata: toInputJsonValue({
        ...sessionMetadata,
        egressId,
        egressEnabled: true,
      }),
    },
  });

  const updatedDraft = await prisma.preScreenQuestionnaireDraft.update({
    where: { id: draft.id },
    data: {
      status: "STARTED",
      currentStep: "session",
      completedAt: null,
      latestAgentContext: toInputJsonValue(latestAgentContext),
    },
    include: { session: true },
  });

  console.info("[pre-screen session] start completed", {
    draftId: draft.id,
    sessionId: recordedSession.id,
    roomName,
    egressId,
  });

  return {
    draft: toPreScreenQuestionnaireDraftDto(updatedDraft),
    session: toPreScreenSessionDto(recordedSession),
    livekit: {
      serverUrl,
      roomName,
      participantToken,
      egressId,
    },
  };
}

export async function completePreScreenSession(input: {
  draftId: string;
  sessionId: string;
  transcript?: unknown;
  transcriptSummary?: unknown;
  sessionMetadata?: unknown;
}): Promise<CompletePreScreenSessionResponseDto> {
  const session = await prisma.preScreenSession.findUnique({
    where: { id: input.sessionId },
  });

  if (!session || session.draftId !== input.draftId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Pre-screen session not found",
    });
  }

  const updatedSession = await prisma.preScreenSession.update({
    where: { id: session.id },
    data: {
      status: "COMPLETED",
      endedAt: new Date(),
      transcript:
        input.transcript === undefined
          ? session.transcript === null
            ? Prisma.DbNull
            : toInputJsonValue(session.transcript)
          : toInputJsonValue(input.transcript),
      transcriptSummary:
        input.transcriptSummary === undefined
          ? session.transcriptSummary === null
            ? Prisma.DbNull
            : toInputJsonValue(session.transcriptSummary)
          : toInputJsonValue(input.transcriptSummary),
      sessionMetadata:
        input.sessionMetadata === undefined
          ? session.sessionMetadata === null
            ? Prisma.DbNull
            : toInputJsonValue(session.sessionMetadata)
          : toInputJsonValue(input.sessionMetadata),
    },
  });

  const updatedDraft = await prisma.preScreenQuestionnaireDraft.update({
    where: { id: input.draftId },
    data: {
      status: "COMPLETED",
      currentStep: "complete",
      completedAt: new Date(),
    },
    include: { session: true },
  });

  return {
    draft: toPreScreenQuestionnaireDraftDto(updatedDraft),
    session: toPreScreenSessionDto(updatedSession),
  };
}

export async function getPreScreenDraftDtoOrThrow(
  draftId: string,
): Promise<PreScreenQuestionnaireDraftDto> {
  const draft = await getDraftRecordOrThrow(draftId);
  return toPreScreenQuestionnaireDraftDto(draft);
}
