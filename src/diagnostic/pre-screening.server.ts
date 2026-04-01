import { prisma } from "#/db.server";
import { PRE_SCREENING_AGENT_TYPE } from "#/diagnostic/config";
import {
  buildPreScreeningParticipantName,
  buildPreScreeningRoomMetadata,
} from "#/diagnostic/config";
import {
  buildPreScreeningParticipantIdentity,
  buildPreScreeningRoomName,
  createPreScreeningLiveKitRoom,
  createPreScreeningLiveKitToken,
  getPreScreeningLiveKitServerUrl,
  startPreScreeningRoomRecording,
} from "#/diagnostic/livekit";
import { asJsonObject, toJsonValue } from "#/diagnostic/pre-screening-metadata";
import type { PreScreeningConnectionDetails } from "#/diagnostic/livekit/types";
import type {
  PreScreenReport,
  PreScreeningSessionStatusResponse,
} from "#/diagnostic/pre-screening-types";
import type { PreScreeningSetup } from "#/lib/pre-screening-setup";

type StartPreScreeningUser = {
  id: string;
  name: string;
  profile?: {
    institution?: string | null;
    degree?: string | null;
    stream?: string | null;
    yearOfStudy?: string | null;
  } | null;
};

function buildPreScreenSessionMetadata(input: { user: StartPreScreeningUser }) {
  return {
    studentId: input.user.id,
  };
}

export async function startPreScreeningSession(input: {
  user: StartPreScreeningUser;
  setup: PreScreeningSetup;
}): Promise<PreScreeningConnectionDetails> {
  const roomName = buildPreScreeningRoomName(input.user.id);
  const participantIdentity = buildPreScreeningParticipantIdentity(input.user.id);
  const participantName = buildPreScreeningParticipantName(input.user.name);
  const roomMetadata = buildPreScreeningRoomMetadata({
    studentName: input.user.name,
    setup: input.setup,
    profile: input.user.profile,
  });
  console.log({ roomMetadata });

  const draft = await prisma.preScreenQuestionnaireDraft.create({
    data: {
      status: "STARTED",
      currentStep: "session",
      answers: {},
      latestAgentContext: {
        studentName: input.user.name,
        profile: input.user.profile ?? null,
        setup: input.setup,
      },
    },
  });

  const sessionMetadata = buildPreScreenSessionMetadata({
    user: input.user,
  });

  const session = await prisma.preScreenSession.create({
    data: {
      draftId: draft.id,
      status: "STARTED",
      roomName,
      agentType: PRE_SCREENING_AGENT_TYPE,
      sessionMetadata: toJsonValue(sessionMetadata),
    },
  });

  try {
    await createPreScreeningLiveKitRoom({
      roomName,
      metadata: {
        ...roomMetadata,
        session_id: session.id,
        draft_id: draft.id,
      },
    });
  } catch (error) {
    await prisma.preScreenSession.update({
      where: { id: session.id },
      data: {
        sessionMetadata: toJsonValue({
          ...sessionMetadata,
          roomCreateError: error instanceof Error ? error.message : "Failed to create room",
        }),
      },
    });
    throw error;
  }

  try {
    const recording = await startPreScreeningRoomRecording({
      roomName,
      sessionId: session.id,
    });

    await prisma.preScreenSession.update({
      where: { id: session.id },
      data: {
        egressId: recording.egressId,
      },
    });
  } catch (error) {
    await prisma.preScreenSession.update({
      where: { id: session.id },
      data: {
        sessionMetadata: toJsonValue({
          ...sessionMetadata,
          egressStartError: error instanceof Error ? error.message : "Failed to start egress",
        }),
      },
    });
    throw error;
  }

  const participantToken = await createPreScreeningLiveKitToken({
    roomName,
    participantIdentity,
    participantName,
  });

  return {
    sessionId: session.id,
    serverUrl: getPreScreeningLiveKitServerUrl(),
    roomName,
    participantName,
    participantIdentity,
    participantToken,
  };
}

export async function getPreScreeningSessionStatus(input: {
  sessionId: string;
  userId: string;
}): Promise<PreScreeningSessionStatusResponse | null> {
  const session = await prisma.preScreenSession.findUnique({
    where: { id: input.sessionId },
    include: { report: true },
  });

  if (!session) {
    return null;
  }

  const sessionMetadata = asJsonObject(session.sessionMetadata);

  if (sessionMetadata.studentId !== input.userId) {
    return null;
  }

  return {
    session: {
      id: session.id,
      status: session.status,
      roomName: session.roomName,
      audioUrl: session.audioUrl,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() ?? null,
    },
    report: session.report
      ? {
          id: session.report.id,
          status: session.report.status,
          promptVersion: session.report.promptVersion,
          fileUri: session.report.fileUri,
          reportJson: (session.report.reportJson as PreScreenReport | null) ?? null,
          errorMessage: session.report.errorMessage,
          metadata: session.report.metadata,
        }
      : null,
  };
}
