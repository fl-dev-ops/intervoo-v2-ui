import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getRoundConfig,
  getRoundNumber,
} from "@/lib/diagnostics/rounds-config";
import type { JobDetail } from "@/lib/jd-client";
import { getDiagnosticRoundRecoveryState } from "@/lib/diagnostics/rules";
import {
  buildDiagnosticRoomName,
  createAgentDispatchClient,
  createParticipantToken,
  createRoomServiceClient,
  getLiveKitCredentials,
} from "@/lib/livekit";
import { getUserStage } from "@/lib/progress";

const LIVEKIT_AGENT_NAME = "intervoo-agent-hs";
const DIAGNOSTIC_AGENT_ID = "diagnostic_v2";
const DIAGNOSTIC_QUESTION_CATEGORY_BY_ROUND: Record<string, string> = {
  behavioural: "behavioral",
  "career-readiness": "closing",
  screening: "opening",
  "technical-thinking": "domain",
};
const DIAGNOSTIC_QUESTION_BAND_BY_SELECTED_BAND = {
  entry: 1,
  mid: 2,
  senior: 3,
} as const;
const COACH_AGENT_DETAILS = {
  arjun: { name: "Arjun", voice: "rahul" },
  Sara: { name: "Sara", voice: "ishita" },
} as const;

type ConnectionDetailsBody = {
  type?: unknown;
  coach?: "Sara" | "arjun";
  round_id?: unknown;
};

type LiveKitCredentials = ReturnType<typeof getLiveKitCredentials>;
type SessionCreationUser = NonNullable<
  Awaited<ReturnType<typeof getSessionCreationUser>>
>;

type SelectedDiagnosticJob = {
  title: string;
  description: string;
  salary: string;
  companies: string[];
  seniority: keyof typeof DIAGNOSTIC_QUESTION_BAND_BY_SELECTED_BAND;
  raw: JobDetail;
};

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

    if (sessionType !== "DIAGNOSTIC_ROUND") {
      return NextResponse.json(
        { error: "Invalid session type" },
        { status: 400 },
      );
    }

    const credentials = getLiveKitCredentials();
    const user = await getSessionCreationUser(session.user.id);
    const stage = await getUserStage(session.user.id);

    console.info("[diagnostics] connection-details request", {
      requestedRoundId: body.round_id ?? null,
      sessionType,
      stage,
      userId: session.user.id,
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (stage !== "DIAGNOSTICS") {
      console.info("[diagnostics] diagnostic connection rejected", {
        reason: "invalid_stage",
        stage,
        userId: session.user.id,
      });
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
    include: { resume: true },
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
    console.info("[diagnostics] diagnostic connection rejected", {
      reason: "invalid_round_id",
      roundId,
      userId: user.id,
    });
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

  const selectedJob = getSelectedDiagnosticJob(diagnostic?.selectedJob);

  if (!diagnostic || !selectedJob) {
    console.info("[diagnostics] diagnostic connection rejected", {
      diagnosticId: diagnostic?.id ?? null,
      reason: "missing_diagnostic_or_job",
      roundId,
      selectedBand: diagnostic?.selectedBand ?? null,
      userId: user.id,
    });
    return NextResponse.json(
      { error: "Select a job before starting a round" },
      { status: 409 },
    );
  }

  const existingRound = diagnostic.rounds.find((r) => r.roundType === roundId);

  if (existingRound) {
    const recoveryState = getDiagnosticRoundRecoveryState({
      reportStartedAt: existingRound.session?.report?.startedAt ?? null,
      reportStatus: existingRound.session?.report?.status ?? null,
      roundType: existingRound.roundType,
      startedAt: existingRound.session?.startedAt ?? null,
      status: existingRound.status,
    });

    console.info("[diagnostics] existing round check", {
      diagnosticId: diagnostic.id,
      existingRoundStatus: existingRound.status,
      isFailed: recoveryState.isRecoverable,
      isReportFailed: recoveryState.isReportFailed,
      isReportStuck: recoveryState.isReportStuck,
      isSessionStuck: recoveryState.isSessionStuck,
      reportStatus: existingRound.session?.report?.status ?? null,
      roundId,
      sessionId: existingRound.sessionId,
      userId: user.id,
    });

    if (!recoveryState.isRecoverable) {
      console.info("[diagnostics] diagnostic connection rejected", {
        reason: "round_already_started",
        roundId,
        sessionId: existingRound.sessionId,
        userId: user.id,
      });
      return NextResponse.json(
        { error: "Round already started" },
        { status: 409 },
      );
    }

    // Delete the old stuck/failed session (cascades to DiagnosticRound + Report)
    await prisma.interviewSession.delete({
      where: { id: existingRound.sessionId },
    });
    console.info("[diagnostics] deleted stuck diagnostic session", {
      roundId,
      sessionId: existingRound.sessionId,
      userId: user.id,
    });
  }

  const requestedRoundNumber = getRoundNumber(roundId);

  const { liveKitUrl } = credentials;
  const agentName = credentials.agentName || LIVEKIT_AGENT_NAME;
  const roomName = buildDiagnosticRoomName(user.id);
  const participantIdentity = `diag_${user.id}`;
  const participantName = user.resume?.name || user.name || "Learner";

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
          roundNumber: requestedRoundNumber,
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

  console.info("[diagnostics] diagnostic session created", {
    diagnosticId: diagnostic.id,
    roomName,
    roundId,
    roundNumber: requestedRoundNumber,
    selectedJob: selectedJob.title,
    sessionId: dbSession.id,
    userId: user.id,
  });

  const appUrl = process.env.WEBHOOK_BASE_URL || request.nextUrl.origin;
  const webhookUrl = appUrl
    ? `${appUrl.replace(/\/$/, "")}/api/reports/generate`
    : "";

  const coach =
    body.coach === "arjun"
      ? "arjun"
      : "Sara";
  const agentDetails = COACH_AGENT_DETAILS[coach];
  const speakingSpeed = getSpeakingSpeed("");
  const voice = agentDetails.voice;
  const questionCategory = DIAGNOSTIC_QUESTION_CATEGORY_BY_ROUND[roundId];
  const questionBand = DIAGNOSTIC_QUESTION_BAND_BY_SELECTED_BAND[selectedJob.seniority];
  const additionalContext = JSON.stringify({
    selected_job_title: selectedJob.title,
    selected_job_description: selectedJob.description,
    selected_job_salary: selectedJob.salary,
    selected_job_companies: selectedJob.companies,
    selected_job_required_skills: selectedJob.raw.requiredSkills,
    selected_job_rounds: selectedJob.raw.rounds,
  });

  const roomMetadata = {
    agent_id: DIAGNOSTIC_AGENT_ID,
    user_id: user.id,
    session_id: dbSession.id,
    interaction_mode: "auto",
    webhook_url: webhookUrl,
    question_filters: {
      band: questionBand,
      category: questionCategory,
      content_type: "diagnostic_question",
      domain: "computer_science",
    },
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
      role: user.resume?.role ?? "",
      skills: user.resume?.skills?.join(", ") ?? "",
      experience_years: user.resume?.experienceYears ?? null,
      education: JSON.stringify(user.resume?.education ?? []),
      speaking_speed: speakingSpeed,
      target_duration_minutes: 15,
      selected_job_title: selectedJob.title,
      selected_job_description: selectedJob.description,
      selected_job_salary: selectedJob.salary,
      selected_job_companies: selectedJob.companies.join(", "),
      selected_job_required_skills: selectedJob.raw.requiredSkills ?? "",
      selected_job_rounds: JSON.stringify(selectedJob.raw.rounds ?? []),
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

  console.info("[diagnostics] livekit agent dispatched", {
    agentName,
    roomName,
    roundId,
    sessionId: dbSession.id,
    userId: user.id,
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
    selected_job: {
      title: selectedJob.title,
      description: selectedJob.description,
      salary: selectedJob.salary,
      companies: selectedJob.companies,
    },
    round_id: roundId,
  });
}

function getSelectedDiagnosticJob(value: unknown): SelectedDiagnosticJob | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const job = value as Partial<JobDetail>;
  if (!job.jobId || !job.jobTitle || !job.companyName) return null;

  const seniority =
    job.seniority === "entry" || job.seniority === "senior"
      ? job.seniority
      : "mid";

  return {
    title: job.jobTitle,
    description: job.roleSummary ?? job.fullJobDescription ?? "",
    salary: formatExperienceLabel(
      job.experienceMinYears ?? null,
      job.experienceMaxYears ?? null,
    ),
    companies: [job.companyName],
    seniority,
    raw: job as JobDetail,
  };
}

function formatExperienceLabel(min: number | null, max: number | null) {
  if (min == null && max == null) return "";
  if (min != null && max != null) return `${min}-${max} years`;
  if (min != null) return `${min}+ years`;
  return `Up to ${max} years`;
}

function getSpeakingSpeed(rawSpeakingSpeed?: string | null) {
  return rawSpeakingSpeed === "relaxed" ? 0.7 : 1;
}
