import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

type LiveKitServerConfig = {
  apiKey: string | undefined;
  apiSecret: string | undefined;
  serverUrl: string | undefined;
};

export type PrediagnosticsConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
};

function getPrediagnosticsLiveKitConfig(): LiveKitServerConfig {
  return {
    apiKey: process.env.LIVEKIT_API_KEY,
    apiSecret: process.env.LIVEKIT_API_SECRET,
    serverUrl: process.env.LIVEKIT_URL,
  };
}

export function getPrediagnosticsLiveKitServerUrl(): string {
  const { serverUrl } = getPrediagnosticsLiveKitConfig();

  if (!serverUrl) {
    throw new Error("LIVEKIT_URL is not configured");
  }

  return serverUrl;
}

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
}): Promise<PrediagnosticsConnectionDetails> {
  const config = getPrediagnosticsLiveKitConfig();

  if (!config.apiKey || !config.apiSecret || !config.serverUrl) {
    throw new Error("LiveKit credentials are not configured");
  }

  const roomClient = new RoomServiceClient(config.serverUrl, config.apiKey, config.apiSecret);

  await roomClient.createRoom({
    name: input.roomName,
    metadata: input.roomMetadata,
    emptyTimeout: 60 * 10,
    maxParticipants: 10,
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

  token.roomConfig = {
    agents: [
      {
        agentName: input.agentName,
        metadata: input.agentMetadata,
      },
    ],
  } as NonNullable<AccessToken["roomConfig"]>;

  return {
    serverUrl: config.serverUrl,
    roomName: input.roomName,
    participantName: input.participantName,
    participantToken: await token.toJwt(),
  };
}
