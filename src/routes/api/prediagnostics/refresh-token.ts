import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "#/db.server";
import { auth } from "#/lib/auth.server";
import {
  buildPrediagnosticsParticipantIdentity,
  buildPrediagnosticsParticipantName,
  createPrediagnosticsConnectionDetails,
} from "#/lib/livekit/prediagnostics";
import { env } from "#/env";

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
    const { sessionId } = (await request.json()) as { sessionId: string };

    if (!sessionId) {
      return Response.json({ error: "Session ID is required" }, { status: 400 });
    }

    const existingSession = await prisma.preDiagnosticSession.findUnique({
      where: { id: sessionId },
    });

    if (!existingSession || existingSession.userId !== user.id) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    if (existingSession.status !== "STARTED") {
      return Response.json(
        { error: "Session is no longer active", status: existingSession.status },
        { status: 409 },
      );
    }

    const sessionMetadata = asObject(existingSession.sessionMetadata);
    const participantIdentity =
      typeof sessionMetadata?.participantIdentity === "string" &&
      sessionMetadata.participantIdentity.trim().length > 0
        ? sessionMetadata.participantIdentity
        : buildPrediagnosticsParticipantIdentity(user.id);

    const participantName = buildPrediagnosticsParticipantName(user.name);
    const storedParticipantName =
      typeof sessionMetadata?.participantName === "string" &&
      sessionMetadata.participantName.trim().length > 0
        ? sessionMetadata.participantName
        : participantName;

    const interactionMode =
      sessionMetadata?.interactionMode === "auto" || sessionMetadata?.interactionMode === "ptt"
        ? sessionMetadata.interactionMode
        : "ptt";

    const coach =
      sessionMetadata?.coach === "arjun" || sessionMetadata?.coach === "sana"
        ? sessionMetadata.coach
        : "sana";

    const speakingSpeedInt =
      user.profile?.speakingSpeed === "normal"
        ? 1
        : user.profile?.speakingSpeed === "relaxed"
          ? 0.7
          : 0.5;

    const voice = user.profile?.coach === "sana" ? "ishita" : "rahul";

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

    const connectionDetails = await createPrediagnosticsConnectionDetails({
      sessionId: existingSession.id,
      roomName: existingSession.roomName,
      participantIdentity,
      participantName: storedParticipantName,
      participantMetadata: JSON.stringify({
        userId: user.id,
        email: user.email,
        sessionId: existingSession.id,
        interaction_mode: interactionMode,
      }),
      roomMetadata: JSON.stringify({
        sessionId: existingSession.id,
        userId: user.id,
        interaction_mode: interactionMode,
        prompt_context: promptContext,
        config: agentConfig,
      }),
      agentName: env.LIVEKIT_AGENT_NAME,
      agentMetadata: JSON.stringify({
        sessionId: existingSession.id,
        studentId: user.id,
        interaction_mode: interactionMode,
        prompt_context: promptContext,
        config: agentConfig,
      }),
      interactionMode,
      coach,
    });

    return Response.json(
      {
        serverUrl: connectionDetails.serverUrl,
        participantToken: connectionDetails.participantToken,
        roomName: connectionDetails.roomName,
        sessionId: connectionDetails.sessionId,
        interactionMode: connectionDetails.interactionMode,
        coach: connectionDetails.coach,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[prediagnostics refresh-token]", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to refresh token" },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/prediagnostics/refresh-token")({
  server: {
    handlers: {
      POST: postHandler,
    },
  },
});
