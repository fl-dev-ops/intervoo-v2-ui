import {
  AccessToken,
  EgressClient,
  EncodedFileOutput,
  RoomServiceClient,
  S3Upload,
  WebhookReceiver,
  type VideoGrant,
} from "livekit-server-sdk";

function getLiveKitConfig() {
  return {
    apiKey: process.env.LIVEKIT_API_KEY,
    apiSecret: process.env.LIVEKIT_API_SECRET,
    serverUrl: process.env.LIVEKIT_URL,
  };
}

export function getPreScreeningLiveKitServerUrl() {
  const { serverUrl } = getLiveKitConfig();

  if (!serverUrl) {
    throw new Error("LIVEKIT_URL is not configured");
  }

  return serverUrl;
}

export async function createPreScreeningLiveKitRoom(input: {
  roomName: string;
  metadata: Record<string, unknown>;
}) {
  const { apiKey, apiSecret, serverUrl } = getLiveKitConfig();

  if (!apiKey || !apiSecret || !serverUrl) {
    throw new Error("LiveKit room credentials are not configured");
  }

  const roomClient = new RoomServiceClient(serverUrl, apiKey, apiSecret);

  await roomClient.createRoom({
    name: input.roomName,
    metadata: JSON.stringify(input.metadata),
    emptyTimeout: 60 * 10,
    maxParticipants: 10,
  });
}

export function getPreScreenWebhookReceiver() {
  const { apiKey, apiSecret } = getLiveKitConfig();

  if (!apiKey || !apiSecret) {
    throw new Error("LiveKit webhook credentials are not configured");
  }

  return new WebhookReceiver(apiKey, apiSecret);
}

export async function createPreScreeningLiveKitToken(input: {
  roomName: string;
  participantIdentity: string;
  participantName: string;
}) {
  const { apiKey, apiSecret } = getLiveKitConfig();

  if (!apiKey || !apiSecret) {
    throw new Error("LiveKit credentials are not configured");
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: input.participantIdentity,
    name: input.participantName,
    ttl: "15m",
  });

  const grant: VideoGrant = {
    room: input.roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };

  token.addGrant(grant);

  return await token.toJwt();
}

export async function startPreScreeningRoomRecording(input: {
  roomName: string;
  sessionId: string;
}) {
  const { apiKey, apiSecret, serverUrl } = getLiveKitConfig();

  if (!apiKey || !apiSecret || !serverUrl) {
    throw new Error("LiveKit egress credentials are not configured");
  }

  const accessKey = process.env.S3_ACCESS_KEY;
  const secret = process.env.S3_SECRET_KEY;
  const region = process.env.S3_REGION;
  const bucket = process.env.S3_BUCKET;

  if (!accessKey || !secret || !region || !bucket) {
    throw new Error("S3 egress configuration is incomplete");
  }

  const egressClient = new EgressClient(serverUrl, apiKey, apiSecret);
  const s3Upload = new S3Upload({
    accessKey,
    secret,
    region,
    bucket,
    ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  });

  const fileOutput = new EncodedFileOutput({
    filepath: `pre-screen-sessions/${input.sessionId}.mp4`,
    output: {
      case: "s3",
      value: s3Upload,
    },
  });

  const egressInfo = await egressClient.startRoomCompositeEgress(
    input.roomName,
    {
      file: fileOutput,
    },
    {
      audioOnly: false,
    },
  );

  return {
    egressId: egressInfo.egressId,
    roomName: egressInfo.roomName,
  };
}

export function shouldAllowUnverifiedLiveKitWebhook() {
  return (
    process.env.NODE_ENV !== "production" && process.env.LIVEKIT_WEBHOOK_ALLOW_UNVERIFIED === "true"
  );
}

export function buildPreScreeningRoomName(seed: string) {
  const safeSeed = seed.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20);
  return `pre_screen_${safeSeed}_${Date.now()}`;
}

export function buildPreScreeningParticipantIdentity(seed: string) {
  const safeSeed = seed.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20);
  return `pre_screen_user_${safeSeed}_${Date.now()}`;
}
