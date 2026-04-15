import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "#/db.server";
import { env } from "#/env";
import { auth } from "#/lib/auth.server";
import {
  DEFAULT_PREDIAGNOSTICS_INTERACTION_MODE,
  type PrediagnosticsInteractionMode,
  buildPrediagnosticsParticipantIdentity,
  buildPrediagnosticsParticipantName,
  buildPrediagnosticsRoomName,
  createPrediagnosticsConnectionDetails,
  createPrediagnosticsReconnectDetails,
} from "#/lib/livekit/prediagnostics";

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export async function postHandler({ request }: { request: Request }) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true },
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const requestBody = (await request.json().catch(() => ({}))) as {
      interactionMode?: unknown;
      sessionId?: unknown;
    };
    const requestedSessionId =
      typeof requestBody.sessionId === "string" && requestBody.sessionId.trim().length > 0
        ? requestBody.sessionId.trim()
        : null;
    const interactionMode: PrediagnosticsInteractionMode =
      requestBody.interactionMode === "auto" || requestBody.interactionMode === "ptt"
        ? requestBody.interactionMode
        : DEFAULT_PREDIAGNOSTICS_INTERACTION_MODE;
    const participantName = buildPrediagnosticsParticipantName(user.name);

    const speakingSpeedInt =
      user.profile?.speakingSpeed === "normal"
        ? 1
        : user.profile?.speakingSpeed === "relaxed"
          ? 0.7
          : 0.5;

    const voice = user.profile?.coach === "sana" ? "ishita" : "rahul";
    const coach = user.profile?.coach === "arjun" ? "arjun" : "sana";

    const studentProfile = {
      preferredName: user.profile?.preferredName ?? "",
      institution: user.profile?.institution ?? "",
      degree: user.profile?.degree ?? "",
      stream: user.profile?.stream ?? "",
      yearOfStudy: user.profile?.yearOfStudy ?? "",
      placementPreparation: user.profile?.placementPreparation ?? "",
      academySelection: user.profile?.academySelection ?? "",
      academyName: user.profile?.academyName ?? "",
      nativeLanguage: user.profile?.nativeLanguage ?? "",
      englishLevel: user.profile?.englishLevel ?? "",
      speakingSpeed: speakingSpeedInt ?? "",
      voice: voice ?? "",
    };

    const promptContext = {
      agentName: coach === "arjun" ? "Arjun" : "Sara",
      userName: user.profile?.preferredName?.trim() || participantName,
      ...studentProfile,
    };

    const agentConfig = {
      voice,
      speakingSpeed: speakingSpeedInt,
    };

    if (requestedSessionId) {
      const existingSession = await prisma.preDiagnosticSession.findUnique({
        where: { id: requestedSessionId },
      });

      if (!existingSession || existingSession.userId !== user.id) {
        return Response.json({ error: "Pre-diagnostic session not found" }, { status: 404 });
      }

      if (existingSession.status !== "STARTED") {
        return Response.json(
          { error: "Pre-diagnostic session is no longer active" },
          { status: 409 },
        );
      }

      const sessionMetadata = asObject(existingSession.sessionMetadata);
      const storedInteractionMode =
        sessionMetadata?.interactionMode === "auto" || sessionMetadata?.interactionMode === "ptt"
          ? sessionMetadata.interactionMode
          : interactionMode;
      const storedParticipantIdentity =
        typeof sessionMetadata?.participantIdentity === "string" &&
        sessionMetadata.participantIdentity.trim().length > 0
          ? sessionMetadata.participantIdentity
          : buildPrediagnosticsParticipantIdentity(user.id);
      const storedParticipantName =
        typeof sessionMetadata?.participantName === "string" &&
        sessionMetadata.participantName.trim().length > 0
          ? sessionMetadata.participantName
          : participantName;
      const storedCoach =
        sessionMetadata?.coach === "arjun" || sessionMetadata?.coach === "sana"
          ? sessionMetadata.coach
          : coach;

      const connectionDetails = await createPrediagnosticsReconnectDetails({
        sessionId: existingSession.id,
        roomName: existingSession.roomName,
        participantIdentity: storedParticipantIdentity,
        participantName: storedParticipantName,
        participantMetadata: JSON.stringify({
          userId: user.id,
          email: user.email,
          sessionId: existingSession.id,
          interaction_mode: storedInteractionMode,
        }),
        interactionMode: storedInteractionMode,
        coach: storedCoach,
      });

      return Response.json(connectionDetails, { status: 200 });
    }

    const baseRoomName = buildPrediagnosticsRoomName(user.id);
    const participantIdentity = buildPrediagnosticsParticipantIdentity(user.id);

    // Check for ANY existing session with this room name (unique constraint applies to all statuses)
    const existingRoomSession = await prisma.preDiagnosticSession.findFirst({
      where: { roomName: baseRoomName },
      orderBy: { createdAt: "desc" },
    });

    if (existingRoomSession) {
      if (existingRoomSession.status === "STARTED") {
        // Active session exists — reconnect to it
        const sessionMetadata = asObject(existingRoomSession.sessionMetadata);
        const storedInteractionMode =
          sessionMetadata?.interactionMode === "auto" || sessionMetadata?.interactionMode === "ptt"
            ? sessionMetadata.interactionMode
            : interactionMode;
        const storedParticipantIdentity =
          typeof sessionMetadata?.participantIdentity === "string" &&
          sessionMetadata.participantIdentity.trim().length > 0
            ? sessionMetadata.participantIdentity
            : participantIdentity;
        const storedParticipantName =
          typeof sessionMetadata?.participantName === "string" &&
          sessionMetadata.participantName.trim().length > 0
            ? sessionMetadata.participantName
            : participantName;
        const storedCoach =
          sessionMetadata?.coach === "arjun" || sessionMetadata?.coach === "sana"
            ? sessionMetadata.coach
            : coach;

        const connectionDetails = await createPrediagnosticsReconnectDetails({
          sessionId: existingRoomSession.id,
          roomName: existingRoomSession.roomName,
          participantIdentity: storedParticipantIdentity,
          participantName: storedParticipantName,
          participantMetadata: JSON.stringify({
            userId: user.id,
            email: user.email,
            sessionId: existingRoomSession.id,
            interaction_mode: storedInteractionMode,
          }),
          interactionMode: storedInteractionMode,
          coach: storedCoach,
        });

        return Response.json(connectionDetails, { status: 200 });
      }

      // Previous session completed — need a unique room name
      const roomName = `${baseRoomName}_${Date.now()}`;
      return await createNewSession({
        roomName,
        participantIdentity,
        participantName,
        interactionMode,
        coach,
        studentProfile,
        agentConfig,
        promptContext,
        user,
      });
    }

    // No prior session — create fresh
    return await createNewSession({
      roomName: baseRoomName,
      participantIdentity,
      participantName,
      interactionMode,
      coach,
      studentProfile,
      agentConfig,
      promptContext,
      user,
    });
  } catch (error) {
    console.error("[prediagnostics token endpoint]", error);

    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to create prediagnostics token",
      },
      { status: 500 },
    );
  }
}

type UserForSession = {
  id: string;
  email: string;
};

async function createNewSession({
  roomName,
  participantIdentity,
  participantName,
  interactionMode,
  coach,
  studentProfile,
  agentConfig,
  promptContext,
  user,
}: {
  roomName: string;
  participantIdentity: string;
  participantName: string;
  interactionMode: PrediagnosticsInteractionMode;
  coach: "sana" | "arjun";
  studentProfile: Record<string, unknown>;
  agentConfig: { voice: string; speakingSpeed: number };
  promptContext: Record<string, unknown>;
  user: UserForSession;
}) {
  const preDiagnosticSession = await prisma.preDiagnosticSession.create({
    data: {
      userId: user.id,
      status: "STARTED",
      roomName,
      sessionMetadata: {
        feature: "prediagnostics",
        participantIdentity,
        participantName,
        interactionMode,
        coach,
        studentProfile,
      },
    },
  });

  const connectionDetails = await createPrediagnosticsConnectionDetails({
    sessionId: preDiagnosticSession.id,
    roomName,
    participantIdentity,
    participantName,
    participantMetadata: JSON.stringify({
      userId: user.id,
      email: user.email,
      sessionId: preDiagnosticSession.id,
      interaction_mode: interactionMode,
    }),
    roomMetadata: JSON.stringify({
      sessionId: preDiagnosticSession.id,
      userId: user.id,
      interaction_mode: interactionMode,
      prompt_context: promptContext,
      config: agentConfig,
    }),
    agentName: env.LIVEKIT_AGENT_NAME,
    agentMetadata: JSON.stringify({
      sessionId: preDiagnosticSession.id,
      studentId: user.id,
      interaction_mode: interactionMode,
      prompt_context: promptContext,
      config: agentConfig,
    }),
    interactionMode,
    coach,
  });

  return Response.json(connectionDetails, { status: 200 });
}

export const Route = createFileRoute("/api/prediagnostics/start")({
  server: {
    handlers: {
      POST: postHandler,
    },
  },
});
