import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import {
  createLiveKitAgentDispatchClient,
  createLiveKitRoomServiceClient,
  getLiveKitServerConfig,
} from "#/lib/livekit/server";
import type { DiagnosticBand, DiagnosticJobOption } from "#/lib/diagnostics/job-options";
import type { PrediagnosticsReportStatusResponse } from "#/lib/prediagnostics/report";

export const DIAGNOSTICS_AGENT_NAME = "diagnostic-agent-local";

const DEFAULT_DIAGNOSTICS_ROOM_EMPTY_TIMEOUT_SECONDS = 60 * 5;
const DIAGNOSTICS_ROOM_DEPARTURE_TIMEOUT_SECONDS = 60 * 5;

export type DiagnosticsConnectionDetails = {
  sessionId: string;
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
  band: DiagnosticBand;
  selectedJob: DiagnosticJobOption;
};

export type DiagnosticsStudentProfileMetadata = {
  preferredName: string;
  fullName: string;
  institution: string;
  degree: string;
  stream: string;
  yearOfStudy: string;
  placementPreparation: string;
  academySelection: string;
  academyName: string;
  nativeLanguage: string;
  englishLevel: string;
  speakingSpeed: string | number;
  coach: string;
};

export type DiagnosticsRoomMetadataInput = {
  sessionId: string;
  userId: string;
  preDiagnosticSessionId: string;
  band: DiagnosticBand;
  selectedJob: DiagnosticJobOption;
  studentProfile: DiagnosticsStudentProfileMetadata;
  prediagnostics: PrediagnosticsReportStatusResponse;
  agentName: string;
  userName: string;
  voice: string;
  speakingSpeed: number;
};

function getRoomEmptyTimeout(): number {
  const envValue = process.env["DIAGNOSTICS_ROOM_EMPTY_TIMEOUT_SECONDS"];
  if (envValue !== undefined) {
    const parsed = Number(envValue);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
  }
  return DEFAULT_DIAGNOSTICS_ROOM_EMPTY_TIMEOUT_SECONDS;
}

export function buildDiagnosticsRoomName(seed: string): string {
  const normalizedSeed = seed.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return `diag_${normalizedSeed}`;
}

export function buildDiagnosticsParticipantIdentity(seed: string): string {
  const normalizedSeed = seed.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return `diag_user_${normalizedSeed}`;
}

export function buildDiagnosticsParticipantName(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : "Student";
}

export function buildDiagnosticsRoomMetadata(input: DiagnosticsRoomMetadataInput) {
  const promptContext = {
    agentName: input.agentName,
    userName: input.userName,
    comfortableLanguage: input.studentProfile.nativeLanguage,
    selected_band: input.band,
    selected_job: input.selectedJob,
    onboarding: input.studentProfile,
    prediagnostics: {
      session: input.prediagnostics.session,
      report: input.prediagnostics.report?.reportJson ?? null,
      transcript: input.prediagnostics.session.transcript,
    },
  };

  return {
    feature: "diagnostics",
    user_id: input.userId,
    userId: input.userId,
    sessionId: input.sessionId,
    diagnosticSessionId: input.sessionId,
    preDiagnosticSessionId: input.preDiagnosticSessionId,
    interaction_mode: "auto",
    selected_band: input.band,
    selected_job: input.selectedJob,
    student_profile: input.studentProfile,
    prediagnostics: {
      session: input.prediagnostics.session,
      report: input.prediagnostics.report?.reportJson ?? null,
      transcript: input.prediagnostics.session.transcript,
    },
    prompt_context: promptContext,
    config: {
      voice: input.voice,
      speakingSpeed: input.speakingSpeed,
      interviewMode: "diagnostic",
      targetDurationMinutes: 15,
    },
  };
}

async function roomExists(roomClient: RoomServiceClient, roomName: string): Promise<boolean> {
  try {
    const rooms = await roomClient.listRooms();
    return rooms.some((room) => room.name === roomName);
  } catch {
    return false;
  }
}

async function createDiagnosticsParticipantConnectionDetails(input: {
  sessionId: string;
  roomName: string;
  participantIdentity: string;
  participantName: string;
  participantMetadata: string;
  band: DiagnosticBand;
  selectedJob: DiagnosticJobOption;
}): Promise<DiagnosticsConnectionDetails> {
  const config = getLiveKitServerConfig();
  const token = new AccessToken(config.apiKey, config.apiSecret, {
    identity: input.participantIdentity,
    name: input.participantName,
    ttl: "15m",
    metadata: input.participantMetadata,
  });

  token.addGrant({
    room: input.roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  });

  return {
    sessionId: input.sessionId,
    serverUrl: config.serverUrl,
    roomName: input.roomName,
    participantName: input.participantName,
    participantToken: await token.toJwt(),
    band: input.band,
    selectedJob: input.selectedJob,
  };
}

export async function createDiagnosticsConnectionDetails(input: {
  sessionId: string;
  roomName: string;
  participantIdentity: string;
  participantName: string;
  participantMetadata: string;
  roomMetadata: string;
  agentMetadata: string;
  band: DiagnosticBand;
  selectedJob: DiagnosticJobOption;
}): Promise<DiagnosticsConnectionDetails> {
  const roomClient = createLiveKitRoomServiceClient();
  const exists = await roomExists(roomClient, input.roomName);

  if (!exists) {
    const dispatchClient = createLiveKitAgentDispatchClient();

    await roomClient.createRoom({
      name: input.roomName,
      metadata: input.roomMetadata,
      emptyTimeout: getRoomEmptyTimeout(),
      departureTimeout: DIAGNOSTICS_ROOM_DEPARTURE_TIMEOUT_SECONDS,
      maxParticipants: 10,
    });

    await dispatchClient.createDispatch(input.roomName, DIAGNOSTICS_AGENT_NAME, {
      metadata: input.agentMetadata,
    });
  }

  return createDiagnosticsParticipantConnectionDetails(input);
}
