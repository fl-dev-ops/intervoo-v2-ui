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

    let roomName: string;
    let dbSessionId: string;
    let storedParticipantIdentity: string;
    let storedParticipantName: string;
    let storedInteractionMode: PrediagnosticsInteractionMode;
    let storedCoach: "sana" | "arjun";

    if (requestedSessionId) {
      const existingSession = await prisma.preDiagnosticSession.findUnique({
        where: { id: requestedSessionId },
      });

      if (
        existingSession &&
        existingSession.userId === user.id &&
        existingSession.status === "STARTED"
      ) {
        const sessionMetadata = asObject(existingSession.sessionMetadata);
        storedInteractionMode =
          sessionMetadata?.interactionMode === "auto" || sessionMetadata?.interactionMode === "ptt"
            ? sessionMetadata.interactionMode
            : interactionMode;
        storedParticipantIdentity =
          typeof sessionMetadata?.participantIdentity === "string" &&
          sessionMetadata.participantIdentity.trim().length > 0
            ? sessionMetadata.participantIdentity
            : buildPrediagnosticsParticipantIdentity(user.id);
        storedParticipantName =
          typeof sessionMetadata?.participantName === "string" &&
          sessionMetadata.participantName.trim().length > 0
            ? sessionMetadata.participantName
            : participantName;
        storedCoach =
          sessionMetadata?.coach === "arjun" || sessionMetadata?.coach === "sana"
            ? sessionMetadata.coach
            : coach;

        roomName = existingSession.roomName;
        dbSessionId = existingSession.id;
      } else {
        const baseRoomName = buildPrediagnosticsRoomName(user.id);
        const newRoomName = `${baseRoomName}_${Date.now()}`;

        const preDiagnosticSession = await prisma.preDiagnosticSession.create({
          data: {
            userId: user.id,
            status: "STARTED",
            roomName: newRoomName,
            sessionMetadata: {
              feature: "prediagnostics",
              participantIdentity: buildPrediagnosticsParticipantIdentity(user.id),
              participantName,
              interactionMode,
              coach,
              studentProfile,
            },
          },
        });

        storedInteractionMode = interactionMode;
        storedParticipantIdentity = buildPrediagnosticsParticipantIdentity(user.id);
        storedParticipantName = participantName;
        storedCoach = coach;
        roomName = newRoomName;
        dbSessionId = preDiagnosticSession.id;
      }
    } else {
      const baseRoomName = buildPrediagnosticsRoomName(user.id);
      const participantIdentity = buildPrediagnosticsParticipantIdentity(user.id);

      const existingRoomSession = await prisma.preDiagnosticSession.findFirst({
        where: { roomName: baseRoomName },
        orderBy: { createdAt: "desc" },
      });

      if (existingRoomSession && existingRoomSession.status === "STARTED") {
        const sessionMetadata = asObject(existingRoomSession.sessionMetadata);
        storedInteractionMode =
          sessionMetadata?.interactionMode === "auto" || sessionMetadata?.interactionMode === "ptt"
            ? sessionMetadata.interactionMode
            : interactionMode;
        storedParticipantIdentity =
          typeof sessionMetadata?.participantIdentity === "string" &&
          sessionMetadata.participantIdentity.trim().length > 0
            ? sessionMetadata.participantIdentity
            : participantIdentity;
        storedParticipantName =
          typeof sessionMetadata?.participantName === "string" &&
          sessionMetadata.participantName.trim().length > 0
            ? sessionMetadata.participantName
            : participantName;
        storedCoach =
          sessionMetadata?.coach === "arjun" || sessionMetadata?.coach === "sana"
            ? sessionMetadata.coach
            : coach;

        roomName = existingRoomSession.roomName;
        dbSessionId = existingRoomSession.id;
      } else {
        const newRoomName = `${baseRoomName}_${Date.now()}`;
        const preDiagnosticSession = await prisma.preDiagnosticSession.create({
          data: {
            userId: user.id,
            status: "STARTED",
            roomName: newRoomName,
            sessionMetadata: {
              feature: "prediagnostics",
              participantIdentity: buildPrediagnosticsParticipantIdentity(user.id),
              participantName,
              interactionMode,
              coach,
              studentProfile,
            },
          },
        });

        storedInteractionMode = interactionMode;
        storedParticipantIdentity = buildPrediagnosticsParticipantIdentity(user.id);
        storedParticipantName = participantName;
        storedCoach = coach;
        roomName = newRoomName;
        dbSessionId = preDiagnosticSession.id;
      }
    }

    const connectionDetails = await createPrediagnosticsConnectionDetails({
      sessionId: dbSessionId,
      roomName,
      participantIdentity: storedParticipantIdentity,
      participantName: storedParticipantName,
      participantMetadata: JSON.stringify({
        userId: user.id,
        email: user.email,
        sessionId: dbSessionId,
        interaction_mode: storedInteractionMode,
      }),
      roomMetadata: JSON.stringify({
        sessionId: dbSessionId,
        userId: user.id,
        interaction_mode: storedInteractionMode,
        prompt_context: promptContext,
        config: agentConfig,
      }),
      agentName: env.LIVEKIT_AGENT_NAME,
      agentMetadata: JSON.stringify({
        sessionId: dbSessionId,
        studentId: user.id,
        interaction_mode: storedInteractionMode,
        prompt_context: promptContext,
        config: agentConfig,
      }),
      interactionMode: storedInteractionMode,
      coach: storedCoach,
    });

    return Response.json(connectionDetails, { status: 200 });
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

export const Route = createFileRoute("/api/prediagnostics/start")({
  server: {
    handlers: {
      POST: postHandler,
    },
  },
});
