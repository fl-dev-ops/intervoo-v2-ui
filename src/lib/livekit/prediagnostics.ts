import { AccessToken } from "livekit-server-sdk";
import {
  createLiveKitAgentDispatchClient,
  createLiveKitRoomServiceClient,
  getLiveKitServerConfig,
} from "#/lib/livekit/server";

export type PrediagnosticsInteractionMode = "auto" | "ptt";

export const DEFAULT_PREDIAGNOSTICS_INTERACTION_MODE: PrediagnosticsInteractionMode = "ptt";

export type PrediagnosticsConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
  interactionMode: PrediagnosticsInteractionMode;
};

export function buildPrediagnosticsRoomName(seed: string): string {
  const normalizedSeed = seed.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return `prediag_${normalizedSeed}_${Date.now()}`;
}

export function buildPrediagnosticsParticipantIdentity(seed: string): string {
  const normalizedSeed = seed.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return `prediag_user_${normalizedSeed}_${Date.now()}`;
}

export function buildPrediagnosticsParticipantName(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : "Student";
}

export async function createPrediagnosticsConnectionDetails(input: {
  roomName: string;
  participantIdentity: string;
  participantName: string;
  participantMetadata: string;
  roomMetadata: string;
  agentName: string;
  agentMetadata: string;
  interactionMode: PrediagnosticsInteractionMode;
}): Promise<PrediagnosticsConnectionDetails> {
  const roomClient = createLiveKitRoomServiceClient();
  const dispatchClient = createLiveKitAgentDispatchClient();
  const config = getLiveKitServerConfig();

  await roomClient.createRoom({
    name: input.roomName,
    metadata: input.roomMetadata,
    emptyTimeout: 60 * 10,
    maxParticipants: 10,
  });

  await dispatchClient.createDispatch(input.roomName, input.agentName, {
    metadata: input.agentMetadata,
  });

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
    serverUrl: config.serverUrl,
    roomName: input.roomName,
    participantName: input.participantName,
    participantToken: await token.toJwt(),
    interactionMode: input.interactionMode,
  };
}
