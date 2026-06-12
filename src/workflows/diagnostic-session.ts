import { FatalError } from "workflow";
import { prisma } from "@/lib/db";
import {
  type GeneratedDiagnosticQuestion,
  generateDiagnosticQuestions,
} from "@/lib/diagnostics/question-generation";
import {
  getRoundConfig,
  getRoundNumber,
  ROUND_ORDER,
} from "@/lib/diagnostics/rounds-config";
import { getDiagnosticRoundRecoveryState } from "@/lib/diagnostics/rules";
import type { JobDetail } from "@/lib/jd-client";
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

type Coach = keyof typeof COACH_AGENT_DETAILS;

export type DiagnosticSessionWorkflowInput = {
  baseUrl: string;
  coach?: Coach;
  roundId: string;
  userId: string;
};

type SelectedDiagnosticJob = {
  title: string;
  description: string;
  salary: string;
  companies: string[];
  seniority: keyof typeof DIAGNOSTIC_QUESTION_BAND_BY_SELECTED_BAND;
  raw: JobDetail;
};

type PreparedDiagnosticSession = {
  additionalContext: string;
  coach: Coach;
  diagnosticId: string;
  participantIdentity: string;
  participantName: string;
  questionBand: number;
  questionCategory: string;
  requestedRoundNumber: number;
  roomName: string;
  roundCompetencies: string[];
  roundId: string;
  selectedJob: SelectedDiagnosticJob;
  speakingSpeed: number;
  user: {
    id: string;
    resume: {
      education: unknown;
      experienceYears: number | null;
      name: string;
      role: string;
      skills: string[];
      experience: string[];
      projects: string[];
    } | null;
  };
  voice: string;
  webhookUrl: string;
};

type PersistedSessionMetadata = {
  metadata: Record<string, unknown>;
  roomName: string;
  selectedJob: SelectedDiagnosticJob;
  sessionId: string;
};

export type DiagnosticSessionWorkflowResult = {
  server_url: string;
  room_name: string;
  participant_name: string;
  participant_token: string;
  session_id: string;
  selected_job: {
    title: string;
    description: string;
    salary: string;
    companies: string[];
  };
  round_id: string;
};

export async function createDiagnosticSessionWorkflow(
  input: DiagnosticSessionWorkflowInput,
): Promise<DiagnosticSessionWorkflowResult> {
  "use workflow";

  const prepared = await prepareDiagnosticSessionStep(input);
  const generated = await generateDiagnosticQuestionsStep(prepared);
  const persisted = await persistDiagnosticSessionMetadataStep(
    prepared,
    generated.questions,
    generated.generationMetadata,
  );
  await createLiveKitRoomStep(persisted.roomName, persisted.metadata);
  await dispatchLiveKitAgentStep(persisted.roomName, persisted.metadata);
  return await createParticipantConnectionDetailsStep(prepared, persisted);
}

async function prepareDiagnosticSessionStep(
  input: DiagnosticSessionWorkflowInput,
): Promise<PreparedDiagnosticSession> {
  "use step";

  if (!getRoundConfig(input.roundId)) {
    throw new FatalError("Invalid round ID");
  }

  const stage = await getUserStage(input.userId);
  if (stage !== "DIAGNOSTICS") {
    throw new FatalError("Diagnostics are not available for this user stage");
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    include: { resume: true },
  });
  if (!user) {
    throw new FatalError("User not found");
  }

  const diagnostic = await prisma.diagnostic.findFirst({
    where: { userId: input.userId },
    include: {
      rounds: {
        include: { session: { include: { report: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const selectedJob = getSelectedDiagnosticJob(diagnostic?.selectedJob);

  if (!diagnostic || !selectedJob) {
    throw new FatalError("Select a job before starting a round");
  }

  const existingRound = diagnostic.rounds.find(
    (round) => round.roundType === input.roundId,
  );

  if (existingRound) {
    const recoveryState = getDiagnosticRoundRecoveryState({
      reportStartedAt: existingRound.session?.report?.startedAt ?? null,
      reportStatus: existingRound.session?.report?.status ?? null,
      roundType: existingRound.roundType,
      startedAt: existingRound.session?.startedAt ?? null,
      status: existingRound.status,
    });

    if (!recoveryState.isRecoverable) {
      throw new FatalError("Round already started");
    }

    await prisma.interviewSession.delete({
      where: { id: existingRound.sessionId },
    });
  }

  const requestedRoundNumber = getRoundNumber(input.roundId);
  const roomName = buildDiagnosticRoomName(input.userId);
  const participantName = user.resume?.name || user.name || "Learner";
  const coach = input.coach === "arjun" ? "arjun" : "Sara";
  const agentDetails = COACH_AGENT_DETAILS[coach];
  const speakingSpeed = getSpeakingSpeed("");
  const questionCategory = DIAGNOSTIC_QUESTION_CATEGORY_BY_ROUND[input.roundId];
  const questionBand =
    DIAGNOSTIC_QUESTION_BAND_BY_SELECTED_BAND[selectedJob.seniority];

  const webhookUrl = input.baseUrl
    ? `${input.baseUrl.replace(/\/$/, "")}/api/reports/generate`
    : "";
  const additionalContext = JSON.stringify({
    selected_job_title: selectedJob.title,
    selected_job_description: selectedJob.description,
    selected_job_salary: selectedJob.salary,
    selected_job_companies: selectedJob.companies,
    selected_job_required_skills: selectedJob.raw.requiredSkills,
    selected_job_rounds: selectedJob.raw.rounds,
  });

  console.info("[diagnostics] diagnostic session input prepared", {
    diagnosticId: diagnostic.id,
    roomName,
    roundId: input.roundId,
    userId: user.id,
  });

  return {
    additionalContext,
    coach,
    diagnosticId: diagnostic.id,
    participantIdentity: `diag_${user.id}`,
    participantName,
    questionBand,
    questionCategory,
    requestedRoundNumber,
    roomName,
    roundCompetencies: getRoundCompetencies(selectedJob.raw, input.roundId),
    roundId: input.roundId,
    selectedJob,
    speakingSpeed,
    user: {
      id: user.id,
      resume: user.resume
        ? {
            education: user.resume.education,
            experienceYears:
              typeof user.resume.experienceYears === "number"
                ? user.resume.experienceYears
                : null,
            name: user.resume.name,
            role: user.resume.role,
            skills: user.resume.skills,
            experience: formatResumeExperience(user.resume.experience),
            projects: formatResumeProjects(user.resume.projects),
          }
        : null,
    },
    voice: agentDetails.voice,
    webhookUrl,
  };
}

async function generateDiagnosticQuestionsStep(
  prepared: PreparedDiagnosticSession,
) {
  "use step";

  const result = await generateDiagnosticQuestions({
    band: prepared.questionBand,
    category: prepared.questionCategory,
    competencies: prepared.roundCompetencies,
    job: prepared.selectedJob.raw,
    participant: {
      name: prepared.participantName,
      role: prepared.user.resume?.role ?? "",
      skills: prepared.user.resume?.skills ?? [],
      experienceYears: prepared.user.resume?.experienceYears ?? null,
      education: prepared.user.resume?.education ?? [],
      experience: prepared.user.resume?.experience ?? [],
      projects: prepared.user.resume?.projects ?? [],
    },
    roundId: prepared.roundId,
  });

  console.info("[diagnostics] diagnostic questions generated", {
    questionCount: result.questions.length,
    roundId: prepared.roundId,
    userId: prepared.user.id,
  });

  return {
    questions: result.questions,
    generationMetadata: result.metadata,
  };
}

generateDiagnosticQuestionsStep.maxRetries = 2;

async function persistDiagnosticSessionMetadataStep(
  prepared: PreparedDiagnosticSession,
  questions: GeneratedDiagnosticQuestion[],
  questionGenerationMetadata: Record<string, unknown>,
): Promise<PersistedSessionMetadata> {
  "use step";

  const dbSession = await prisma.interviewSession.create({
    data: {
      userId: prepared.user.id,
      type: "DIAGNOSTIC_ROUND",
      roomName: prepared.roomName,
      status: "STARTED",
      startedAt: new Date(),
      diagnosticRound: {
        create: {
          diagnosticId: prepared.diagnosticId,
          roundNumber: prepared.requestedRoundNumber,
          roundType: prepared.roundId,
        },
      },
    },
    include: { diagnosticRound: true },
  });

  await prisma.diagnostic.update({
    where: { id: prepared.diagnosticId },
    data: { currentRound: prepared.requestedRoundNumber },
  });

  const roomMetadata = {
    agent_id: DIAGNOSTIC_AGENT_ID,
    user_id: prepared.user.id,
    session_id: dbSession.id,
    interaction_mode: "auto",
    webhook_url: prepared.webhookUrl,
    questions,
    question_generation: {
      ...questionGenerationMetadata,
      job_id: prepared.selectedJob.raw.jobId,
      round_id: prepared.roundId,
    },
    question_filters: {
      band: prepared.questionBand,
      category: prepared.questionCategory,
      content_type: "diagnostic_question",
      domain: "computer_science",
    },
    config: {
      voice: prepared.voice,
      speakingSpeed: prepared.speakingSpeed,
    },
    prompt_context: {
      agent_name: COACH_AGENT_DETAILS[prepared.coach].name,
      user_name: prepared.participantName,
      additional_context: prepared.additionalContext,
      current_round: prepared.roundId,
      diagnostic_id: prepared.diagnosticId,
      coach: prepared.coach,
      role: prepared.user.resume?.role ?? "",
      skills: prepared.user.resume?.skills.join(", ") ?? "",
      experience_years: prepared.user.resume?.experienceYears ?? null,
      education: JSON.stringify(prepared.user.resume?.education ?? []),
      speaking_speed: prepared.speakingSpeed,
      target_duration_minutes: 15,
      selected_job_title: prepared.selectedJob.title,
      selected_job_description: prepared.selectedJob.description,
      selected_job_salary: prepared.selectedJob.salary,
      selected_job_companies: prepared.selectedJob.companies.join(", "),
      selected_job_required_skills:
        prepared.selectedJob.raw.requiredSkills ?? "",
      selected_job_rounds: JSON.stringify(
        prepared.selectedJob.raw.rounds ?? [],
      ),
    },
  };

  await prisma.interviewSession.update({
    where: { id: dbSession.id },
    data: { metadata: roomMetadata as object },
  });

  console.info("[diagnostics] diagnostic session created", {
    diagnosticId: prepared.diagnosticId,
    questionCount: questions.length,
    roomName: prepared.roomName,
    roundId: prepared.roundId,
    sessionId: dbSession.id,
    userId: prepared.user.id,
  });

  return {
    metadata: roomMetadata,
    roomName: prepared.roomName,
    selectedJob: prepared.selectedJob,
    sessionId: dbSession.id,
  };
}

async function createLiveKitRoomStep(
  roomName: string,
  metadata: Record<string, unknown>,
) {
  "use step";

  const roomClient = createRoomServiceClient();
  await roomClient.createRoom({
    name: roomName,
    metadata: JSON.stringify(metadata),
    emptyTimeout: 60 * 15,
    maxParticipants: 5,
  });
}

async function dispatchLiveKitAgentStep(
  roomName: string,
  metadata: Record<string, unknown>,
) {
  "use step";

  const credentials = getLiveKitCredentials();
  const agentName = credentials.agentName || LIVEKIT_AGENT_NAME;
  const agentDispatchClient = createAgentDispatchClient();
  await agentDispatchClient.createDispatch(roomName, agentName, {
    metadata: JSON.stringify(metadata),
  });
}

async function createParticipantConnectionDetailsStep(
  prepared: PreparedDiagnosticSession,
  persisted: PersistedSessionMetadata,
): Promise<DiagnosticSessionWorkflowResult> {
  "use step";

  const { liveKitUrl } = getLiveKitCredentials();
  const participantToken = await createParticipantToken({
    identity: prepared.participantIdentity,
    name: prepared.participantName,
    roomName: persisted.roomName,
  });

  return {
    server_url: liveKitUrl,
    room_name: persisted.roomName,
    participant_name: prepared.participantName,
    participant_token: participantToken,
    session_id: persisted.sessionId,
    selected_job: {
      title: persisted.selectedJob.title,
      description: persisted.selectedJob.description,
      salary: persisted.selectedJob.salary,
      companies: persisted.selectedJob.companies,
    },
    round_id: prepared.roundId,
  };
}

function getSelectedDiagnosticJob(
  value: unknown,
): SelectedDiagnosticJob | null {
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

function formatResumeExperience(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return "";
      const e = entry as Record<string, unknown>;
      const title = typeof e.title === "string" ? e.title : "";
      const company = typeof e.company === "string" ? e.company : "";
      const description =
        typeof e.description === "string" ? e.description : "";
      const header = [title, company].filter(Boolean).join(" · ");
      return [header, description].filter(Boolean).join(": ");
    })
    .filter(Boolean);
}

function formatResumeProjects(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return "";
      const p = entry as Record<string, unknown>;
      const title = typeof p.title === "string" ? p.title : "";
      const description =
        typeof p.description === "string" ? p.description : "";
      return [title, description].filter(Boolean).join(" · ");
    })
    .filter(Boolean);
}

function getRoundCompetencies(job: JobDetail, roundId: string) {
  const roundIndex = ROUND_ORDER.indexOf(roundId);
  if (roundIndex < 0) return [];
  return job.rounds[roundIndex]?.competencies ?? [];
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
