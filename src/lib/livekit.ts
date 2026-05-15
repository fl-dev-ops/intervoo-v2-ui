import {
  AccessToken,
  type AccessTokenOptions,
  AgentDispatchClient,
  RoomServiceClient,
  type VideoGrant,
} from "livekit-server-sdk";

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
const liveKitUrl = process.env.LIVEKIT_URL;
const agentName = process.env.LIVEKIT_AGENT_NAME;

export function getLiveKitCredentials() {
  if (!apiKey || !apiSecret || !liveKitUrl) {
    throw new Error("LiveKit credentials not configured");
  }
  return { apiKey, apiSecret, liveKitUrl, agentName };
}

export function createRoomServiceClient() {
  const { apiKey, apiSecret, liveKitUrl } = getLiveKitCredentials();
  return new RoomServiceClient(liveKitUrl, apiKey, apiSecret);
}

export function createAgentDispatchClient() {
  const { apiKey, apiSecret, liveKitUrl } = getLiveKitCredentials();
  return new AgentDispatchClient(liveKitUrl, apiKey, apiSecret);
}

export function buildPreDiagnosticRoomName() {
  return `prediagnostic_${crypto.randomUUID()}`;
}

export function buildDiagnosticRoomName(seed: string) {
  return `diagnostic_${seed}_${Date.now()}`;
}

export async function createParticipantToken(params: {
  identity: string;
  name: string;
  roomName: string;
}) {
  const { apiKey, apiSecret } = getLiveKitCredentials();

  const tokenOptions: AccessTokenOptions = {
    identity: params.identity,
    name: params.name,
    ttl: "15m",
  };

  const accessToken = new AccessToken(apiKey, apiSecret, tokenOptions);

  const grant: VideoGrant = {
    room: params.roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };

  accessToken.addGrant(grant);

  return await accessToken.toJwt();
}

export interface ConnectionDetails {
  server_url: string;
  room_name: string;
  participant_name: string;
  participant_token: string;
  agent_name: string;
}
