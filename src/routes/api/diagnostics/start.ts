import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "#/db.server";
import { auth } from "#/lib/auth.server";
import {
  buildDiagnosticJobOptions,
  getDiagnosticJobOption,
  parseDiagnosticBand,
} from "#/lib/diagnostics/job-options";
import {
  buildDiagnosticsParticipantIdentity,
  buildDiagnosticsParticipantName,
  buildDiagnosticsRoomMetadata,
  buildDiagnosticsRoomName,
  createDiagnosticsConnectionDetails,
} from "#/lib/livekit/diagnostics";
import { getLatestPreDiagnosticSessionStatus } from "#/lib/prediagnostics/report.server";
import { toJsonValue } from "#/lib/prediagnostics/prisma-utils";

export async function postHandler({ request }: { request: Request }) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { band?: unknown } | null;
  const band = parseDiagnosticBand(body?.band);

  if (!band) {
    return Response.json({ error: "Invalid diagnostic band" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true },
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const latestPrediagnostics = await getLatestPreDiagnosticSessionStatus(user.id);

  if (
    !latestPrediagnostics?.report ||
    latestPrediagnostics.report.status !== "READY" ||
    !latestPrediagnostics.report.reportJson
  ) {
    return Response.json({ error: "Pre-diagnostics report is required" }, { status: 409 });
  }

  const options = buildDiagnosticJobOptions(latestPrediagnostics);
  const selectedJob = getDiagnosticJobOption(options, band);

  if (!selectedJob) {
    return Response.json({ error: "Selected diagnostic job was not found" }, { status: 409 });
  }

  try {
    const participantName = buildDiagnosticsParticipantName(user.name);
    const baseRoomName = buildDiagnosticsRoomName(user.id);
    const roomName = `${baseRoomName}_${Date.now()}`;

    const speakingSpeed =
      user.profile?.speakingSpeed === "normal"
        ? 1
        : user.profile?.speakingSpeed === "relaxed"
          ? 0.7
          : 0.5;
    const voice = user.profile?.coach === "sana" ? "ishita" : "rahul";
    const coach = user.profile?.coach === "arjun" ? "arjun" : "sana";

    const diagnosticSession = await prisma.diagnosticSession.create({
      data: {
        userId: user.id,
        preDiagnosticSessionId: latestPrediagnostics.session.id,
        status: "STARTED",
        band,
        selectedJob: toJsonValue(selectedJob),
        roomName,
      },
    });

    const studentProfile = {
      preferredName: user.profile?.preferredName ?? "",
      fullName: user.name,
      institution: user.profile?.institution ?? "",
      degree: user.profile?.degree ?? "",
      stream: user.profile?.stream ?? "",
      yearOfStudy: user.profile?.yearOfStudy ?? "",
      placementPreparation: user.profile?.placementPreparation ?? "",
      academySelection: user.profile?.academySelection ?? "",
      academyName: user.profile?.academyName ?? "",
      nativeLanguage: user.profile?.nativeLanguage ?? "",
      englishLevel: user.profile?.englishLevel ?? "",
      speakingSpeed,
      coach,
    };

    const promptUserName = user.profile?.preferredName?.trim() || participantName;
    const roomMetadata = buildDiagnosticsRoomMetadata({
      sessionId: diagnosticSession.id,
      userId: user.id,
      preDiagnosticSessionId: latestPrediagnostics.session.id,
      band,
      selectedJob,
      studentProfile,
      prediagnostics: latestPrediagnostics,
      agentName: coach === "arjun" ? "Arjun" : "Sara",
      userName: promptUserName,
      voice,
      speakingSpeed,
    });

    await prisma.diagnosticSession.update({
      where: { id: diagnosticSession.id },
      data: {
        sessionMetadata: toJsonValue(roomMetadata),
      },
    });

    const participantIdentity = buildDiagnosticsParticipantIdentity(diagnosticSession.id);
    const connectionDetails = await createDiagnosticsConnectionDetails({
      sessionId: diagnosticSession.id,
      roomName,
      participantIdentity,
      participantName,
      participantMetadata: JSON.stringify({
        userId: user.id,
        user_id: user.id,
        email: user.email,
        sessionId: diagnosticSession.id,
        diagnosticSessionId: diagnosticSession.id,
        preDiagnosticSessionId: latestPrediagnostics.session.id,
        band,
      }),
      roomMetadata: JSON.stringify(roomMetadata),
      agentMetadata: JSON.stringify({
        sessionId: diagnosticSession.id,
        studentId: user.id,
        user_id: user.id,
        interaction_mode: "auto",
        prompt_context: roomMetadata.prompt_context,
        config: roomMetadata.config,
      }),
      band,
      selectedJob,
    });

    return Response.json(connectionDetails, { status: 200 });
  } catch (error) {
    console.error("[diagnostics start endpoint]", error);

    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to start diagnostic session",
      },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/diagnostics/start")({
  server: {
    handlers: {
      POST: postHandler,
    },
  },
});
