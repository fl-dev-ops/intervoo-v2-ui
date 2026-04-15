import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import {
  createLiveKitAgentDispatchClient,
  createLiveKitRoomServiceClient,
  getLiveKitServerConfig,
} from "#/lib/livekit/server";

export type PrediagnosticsInteractionMode = "auto" | "ptt";

export const DEFAULT_PREDIAGNOSTICS_INTERACTION_MODE: PrediagnosticsInteractionMode = "ptt";
const DEFAULT_PREDIAGNOSTICS_ROOM_EMPTY_TIMEOUT_SECONDS = 60 * 5;
const PREDIAGNOSTICS_ROOM_DEPARTURE_TIMEOUT_SECONDS = 60 * 5;

function getRoomEmptyTimeout(): number {
  const envValue = process.env["PREDIAGNOSTICS_ROOM_EMPTY_TIMEOUT_SECONDS"];
  if (envValue !== undefined) {
    const parsed = Number(envValue);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
  }
  return DEFAULT_PREDIAGNOSTICS_ROOM_EMPTY_TIMEOUT_SECONDS;
}

export type PrediagnosticsConnectionDetails = {
  sessionId: string;
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
  interactionMode: PrediagnosticsInteractionMode;
  coach: "sana" | "arjun";
};

export function buildPrediagnosticsRoomName(seed: string): string {
  const normalizedSeed = seed.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return `prediag_${normalizedSeed}`;
}

export function buildPrediagnosticsParticipantIdentity(seed: string): string {
  const normalizedSeed = seed.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return `prediag_user_${normalizedSeed}`;
}

export function buildPrediagnosticsParticipantName(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : "Student";
}

async function roomExists(roomClient: RoomServiceClient, roomName: string): Promise<boolean> {
  try {
    const rooms = await roomClient.listRooms();
    return rooms.some((room) => room.name === roomName);
  } catch {
    return false;
  }
}

async function createPrediagnosticsParticipantConnectionDetails(input: {
  sessionId: string;
  roomName: string;
  participantIdentity: string;
  participantName: string;
  participantMetadata: string;
  interactionMode: PrediagnosticsInteractionMode;
  coach: "sana" | "arjun";
}): Promise<PrediagnosticsConnectionDetails> {
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
    interactionMode: input.interactionMode,
    coach: input.coach,
  };
}

export async function createPrediagnosticsConnectionDetails(input: {
  sessionId: string;
  roomName: string;
  participantIdentity: string;
  participantName: string;
  participantMetadata: string;
  roomMetadata: string;
  agentName: string;
  agentMetadata: string;
  interactionMode: PrediagnosticsInteractionMode;
  coach: "sana" | "arjun";
}): Promise<PrediagnosticsConnectionDetails> {
  const roomClient = createLiveKitRoomServiceClient();

  const exists = await roomExists(roomClient, input.roomName);

  if (!exists) {
    const dispatchClient = createLiveKitAgentDispatchClient();

    await roomClient.createRoom({
      name: input.roomName,
      metadata: input.roomMetadata,
      emptyTimeout: getRoomEmptyTimeout(),
      departureTimeout: PREDIAGNOSTICS_ROOM_DEPARTURE_TIMEOUT_SECONDS,
      maxParticipants: 10,
    });

    await dispatchClient.createDispatch(input.roomName, input.agentName, {
      metadata: input.agentMetadata,
    });
  }

  return createPrediagnosticsParticipantConnectionDetails(input);
}
