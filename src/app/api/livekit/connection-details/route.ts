import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  buildDiagnosticJobOptions,
  getDiagnosticJobOption,
  parseDiagnosticBand,
} from "@/lib/diagnostics/job-options";
import {
  getRoundConfig,
  getRoundNumber,
} from "@/lib/diagnostics/rounds-config";
import {
  buildDiagnosticRoomName,
  buildPreDiagnosticRoomName,
  createAgentDispatchClient,
  createParticipantToken,
  createRoomServiceClient,
  getLiveKitCredentials,
} from "@/lib/livekit";
import { getUserStage } from "@/lib/progress";

const LIVEKIT_AGENT_NAME = "intervoo-agent";
const PREDIAGNOSTIC_AGENT_ID = "pre_screen";
const DIAGNOSTIC_AGENT_ID = "diagnostic";
const COACH_AGENT_DETAILS = {
  arjun: { name: "Arjun", voice: "rahul" },
  sana: { name: "Sana", voice: "ishita" },
} as const;

type ConnectionDetailsBody = {
  type?: unknown;
  device_id?: string;
  video_device_id?: string;
  interaction_mode?: "ptt" | "auto";
  coach?: "sana" | "arjun";
  round_id?: unknown;
};

type LiveKitCredentials = ReturnType<typeof getLiveKitCredentials>;
type SessionCreationUser = NonNullable<
  Awaited<ReturnType<typeof getSessionCreationUser>>
>;

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ConnectionDetailsBody;
    const sessionType = body.type;

    if (sessionType !== "PREDIAGNOSTIC" && sessionType !== "DIAGNOSTIC_ROUND") {
      return NextResponse.json(
        { error: "Invalid session type" },
        { status: 400 },
      );
    }

    const credentials = getLiveKitCredentials();
    const user = await getSessionCreationUser(session.user.id);
    const stage = await getUserStage(session.user.id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (sessionType === "DIAGNOSTIC_ROUND") {
      if (stage !== "DIAGNOSTICS") {
        return NextResponse.json(
          { error: "Diagnostics are not available for this user stage" },
          { status: 409 },
        );
      }

      return await createDiagnosticConnectionDetails({
        body,
        credentials,
        request,
        user,
      });
    }

    if (stage !== "PREDIAGNOSTICS") {
      return NextResponse.json(
        { error: "Pre-diagnostics are not available for this user stage" },
        { status: 409 },
      );
    }

    return await createPrediagnosticConnectionDetails({
      body,
      credentials,
      request,
      user,
    });
  } catch (error) {
    console.error("LiveKit connection details error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create connection details",
      },
      { status: 500 },
    );
  }
}

async function getSessionCreationUser(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
}

async function createPrediagnosticConnectionDetails({
  body,
  credentials,
  request,
  user,
}: {
  body: ConnectionDetailsBody;
  credentials: LiveKitCredentials;
  request: NextRequest;
  user: SessionCreationUser;
}) {
  const { liveKitUrl } = credentials;
  const agentName = credentials.agentName || LIVEKIT_AGENT_NAME;

  const interactionMode = body.interaction_mode || "ptt";
  const coach =
    body.coach === "arjun"
      ? "arjun"
      : user.profile?.coach === "arjun"
        ? "arjun"
        : "sana";
  const agentDetails = COACH_AGENT_DETAILS[coach];
  const speakingSpeed = getSpeakingSpeed(user.profile?.speakingSpeed);

  const roomName = buildPreDiagnosticRoomName();
  const participantIdentity = `user_${user.id}`;
  const participantName = user.profile?.preferredName || user.name || "Learner";

  const dbSession = await prisma.interviewSession.create({
    data: {
      userId: user.id,
      type: "PREDIAGNOSTIC",
      roomName,
      status: "STARTED",
      startedAt: new Date(),
      preDiagnostic: {
        create: {},
      },
    },
  });

  const appUrl = process.env.WEBHOOK_BASE_URL || request.nextUrl.origin;
  const webhookUrl = appUrl
    ? `${appUrl.replace(/\/$/, "")}/api/reports/generate`
    : "";

  const roomMetadata = {
    agent_id: PREDIAGNOSTIC_AGENT_ID,
    user_id: user.id,
    session_id: dbSession.id,
    interaction_mode: interactionMode,
    webhook_url: webhookUrl,
    config: {
      voice: agentDetails.voice,
      speakingSpeed,
    },
    prompt_context: {
      agent_name: agentDetails.name,
      user_name: participantName,
      additional_context: "",
      coach,
      device_id: body.device_id || null,
      video_device_id: body.video_device_id || null,
      english_level: user.profile?.englishLevel ?? "",
      comfortable_language: user.profile?.nativeLanguage ?? "",
      institution: user.profile?.institution ?? "",
      degree: user.profile?.degree ?? "",
      stream: user.profile?.stream ?? "",
      placement_preparation: user.profile?.placementPreparation ?? "",
      academy_selection: user.profile?.academySelection ?? "",
      academy_name: user.profile?.academyName ?? "",
      speaking_speed: speakingSpeed,
    },
  };

  await prisma.interviewSession.update({
    where: { id: dbSession.id },
    data: { metadata: roomMetadata },
  });

  const roomClient = createRoomServiceClient();
  await roomClient.createRoom({
    name: roomName,
    metadata: JSON.stringify(roomMetadata),
    emptyTimeout: 60 * 10,
    maxParticipants: 5,
  });

  await prisma.profile.update({
    where: { userId: user.id },
    data: { coach },
  });

  const agentDispatchClient = createAgentDispatchClient();
  await agentDispatchClient.createDispatch(roomName, agentName, {
    metadata: JSON.stringify(roomMetadata),
  });

  const participantToken = await createParticipantToken({
    identity: participantIdentity,
    name: participantName,
    roomName,
  });

  return NextResponse.json({
    server_url: liveKitUrl,
    room_name: roomName,
    participant_name: participantName,
    participant_token: participantToken,
    session_id: dbSession.id,
    interaction_mode: interactionMode,
  });
}

async function createDiagnosticConnectionDetails({
  body,
  credentials,
  request,
  user,
}: {
  body: ConnectionDetailsBody;
  credentials: LiveKitCredentials;
  request: NextRequest;
  user: SessionCreationUser;
}) {
  const roundId = typeof body.round_id === "string" ? body.round_id : null;

  if (!roundId || !getRoundConfig(roundId)) {
    return NextResponse.json({ error: "Invalid round ID" }, { status: 400 });
  }

  const diagnostic = await prisma.diagnostic.findFirst({
    where: { userId: user.id },
    include: {
      rounds: {
        include: { session: { include: { report: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const band = parseDiagnosticBand(diagnostic?.selectedBand);

  if (!diagnostic || !band) {
    return NextResponse.json(
      { error: "Select a diagnostic band before starting a round" },
      { status: 409 },
    );
  }

  const jobOptions = buildDiagnosticJobOptions();
  const selectedJob = getDiagnosticJobOption(jobOptions, band);

  if (!selectedJob) {
    return NextResponse.json(
      { error: "Selected diagnostic job was not found" },
      { status: 409 },
    );
  }

  const existingRound = diagnostic.rounds.find((r) => r.roundType === roundId);

  if (existingRound) {
    return NextResponse.json(
      { error: "Round already started" },
      { status: 409 },
    );
  }

  const completedCount = diagnostic.rounds.filter(
    (round) => round.status === "COMPLETED" || round.status === "REPORT_READY",
  ).length;
  const requestedRoundNumber = getRoundNumber(roundId);

  if (requestedRoundNumber !== completedCount + 1) {
    return NextResponse.json(
      { error: "Complete the previous round before starting this one" },
      { status: 409 },
    );
  }

  const { liveKitUrl } = credentials;
  const agentName = credentials.agentName || LIVEKIT_AGENT_NAME;
  const roomName = buildDiagnosticRoomName(user.id);
  const participantIdentity = `diag_${user.id}`;
  const participantName = user.profile?.preferredName || user.name || "Learner";

  const dbSession = await prisma.interviewSession.create({
    data: {
      userId: user.id,
      type: "DIAGNOSTIC_ROUND",
      roomName,
      status: "STARTED",
      startedAt: new Date(),
      diagnosticRound: {
        create: {
          diagnosticId: diagnostic.id,
          roundNumber: getRoundNumber(roundId),
          roundType: roundId,
        },
      },
    },
    include: { diagnosticRound: true },
  });

  await prisma.diagnostic.update({
    where: { id: diagnostic.id },
    data: { currentRound: requestedRoundNumber },
  });

  const appUrl = process.env.WEBHOOK_BASE_URL || request.nextUrl.origin;
  const webhookUrl = appUrl
    ? `${appUrl.replace(/\/$/, "")}/api/reports/generate`
    : "";

  const coach =
    body.coach === "arjun"
      ? "arjun"
      : user.profile?.coach === "arjun"
        ? "arjun"
        : "sana";
  const agentDetails = COACH_AGENT_DETAILS[coach];
  const speakingSpeed = getSpeakingSpeed(user.profile?.speakingSpeed);
  const voice = agentDetails.voice;
  const additionalContext = JSON.stringify({
    selected_job_title: selectedJob.title,
    selected_job_description: selectedJob.description,
    selected_job_salary: selectedJob.salary,
    selected_job_companies: selectedJob.companies,
  });

  const roomMetadata = {
    agent_id: DIAGNOSTIC_AGENT_ID,
    user_id: user.id,
    session_id: dbSession.id,
    interaction_mode: "auto",
    webhook_url: webhookUrl,
    config: {
      voice,
      speakingSpeed,
    },
    prompt_context: {
      agent_name: agentDetails.name,
      user_name: participantName,
      additional_context: additionalContext,
      current_round: roundId,
      diagnostic_id: diagnostic.id,
      coach,
      comfortable_language: user.profile?.nativeLanguage ?? "",
      english_level: user.profile?.englishLevel ?? "",
      institution: user.profile?.institution ?? "",
      degree: user.profile?.degree ?? "",
      stream: user.profile?.stream ?? "",
      year_of_study: user.profile?.yearOfStudy ?? "",
      placement_preparation: user.profile?.placementPreparation ?? "",
      academy_selection: user.profile?.academySelection ?? "",
      academy_name: user.profile?.academyName ?? "",
      speaking_speed: speakingSpeed,
      target_duration_minutes: 15,
      selected_job_title: selectedJob.title,
      selected_job_description: selectedJob.description,
      selected_job_salary: selectedJob.salary,
      selected_job_companies: selectedJob.companies.join(", "),
    },
  };

  await prisma.interviewSession.update({
    where: { id: dbSession.id },
    data: { metadata: roomMetadata as object },
  });

  const roomClient = createRoomServiceClient();
  await roomClient.createRoom({
    name: roomName,
    metadata: JSON.stringify(roomMetadata),
    emptyTimeout: 60 * 15,
    maxParticipants: 5,
  });

  const agentDispatchClient = createAgentDispatchClient();
  await agentDispatchClient.createDispatch(roomName, agentName, {
    metadata: JSON.stringify(roomMetadata),
  });

  const participantToken = await createParticipantToken({
    identity: participantIdentity,
    name: participantName,
    roomName,
  });

  return NextResponse.json({
    server_url: liveKitUrl,
    room_name: roomName,
    participant_name: participantName,
    participant_token: participantToken,
    session_id: dbSession.id,
    selected_job: selectedJob,
    round_id: roundId,
  });
}

function getSpeakingSpeed(rawSpeakingSpeed?: string | null) {
  return rawSpeakingSpeed === "relaxed" ? 0.7 : 1;
}
