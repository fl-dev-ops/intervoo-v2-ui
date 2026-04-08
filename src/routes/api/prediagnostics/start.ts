import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "#/db.server";
import { auth } from "#/lib/auth.server";
import {
  DEFAULT_PREDIAGNOSTICS_INTERACTION_MODE,
  type PrediagnosticsInteractionMode,
  buildPrediagnosticsParticipantIdentity,
  buildPrediagnosticsParticipantName,
  buildPrediagnosticsRoomName,
  createPrediagnosticsConnectionDetails,
} from "#/lib/livekit/prediagnostics";

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
    };
    const interactionMode: PrediagnosticsInteractionMode =
      requestBody.interactionMode === "auto" || requestBody.interactionMode === "ptt"
        ? requestBody.interactionMode
        : DEFAULT_PREDIAGNOSTICS_INTERACTION_MODE;
    const roomName = buildPrediagnosticsRoomName(user.id);
    const participantIdentity = buildPrediagnosticsParticipantIdentity(user.id);
    const participantName = buildPrediagnosticsParticipantName(user.name);

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
        feature: "prediagnostics",
        interaction_mode: interactionMode,
      }),
      roomMetadata: JSON.stringify({
        feature: "prediagnostics",
        sessionId: preDiagnosticSession.id,
        userId: user.id,
        studentName: participantName,
        studentEmail: user.email,
        interaction_mode: interactionMode,
        studentProfile,
      }),
      agentName: "pre-screen-agent",
      agentMetadata: JSON.stringify({
        sessionId: preDiagnosticSession.id,
        studentId: user.id,
        studentName: participantName,
        studentEmail: user.email,
        interaction_mode: interactionMode,
        studentProfile,
      }),
      interactionMode,
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
