import {
  AccessToken,
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  RoomServiceClient,
  S3Upload,
  type VideoGrant,
  WebhookReceiver,
} from "livekit-server-sdk";
import { PRE_SCREEN_AGENT_TYPE } from "./constants";

function toLoggableError(error: unknown) {
  if (error instanceof Error) {
    const base = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } as Record<string, unknown>;

    for (const key of Object.getOwnPropertyNames(error)) {
      if (!(key in base)) {
        base[key] = (error as unknown as Record<string, unknown>)[key];
      }
    }

    return base;
  }

  return {
    message: typeof error === "string" ? error : "Unknown error",
    raw: error,
  };
}

function getSafeLiveKitConfigSummary() {
  return {
    livekitUrl: process.env.LIVEKIT_URL ?? null,
    hasApiKey: Boolean(process.env.LIVEKIT_API_KEY),
    hasApiSecret: Boolean(process.env.LIVEKIT_API_SECRET),
    hasS3AccessKey: Boolean(process.env.S3_ACCESS_KEY),
    hasS3SecretKey: Boolean(process.env.S3_SECRET_KEY),
    s3Region: process.env.S3_REGION ?? null,
    s3Bucket: process.env.S3_BUCKET ?? null,
    s3Endpoint: process.env.S3_ENDPOINT ?? null,
    s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE ?? null,
  };
}

function getLiveKitConfig() {
  return {
    apiKey: process.env.LIVEKIT_API_KEY,
    apiSecret: process.env.LIVEKIT_API_SECRET,
    serverUrl: process.env.LIVEKIT_URL,
  };
}

export function getPreScreenLiveKitServerUrl() {
  const { serverUrl } = getLiveKitConfig();
  if (!serverUrl) {
    throw new Error("LIVEKIT_URL is not configured");
  }

  return serverUrl;
}

export function createPreScreenLiveKitToken(input: {
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

  return token.toJwt();
}

export function getPreScreenWebhookReceiver() {
  const { apiKey, apiSecret } = getLiveKitConfig();

  if (!apiKey || !apiSecret) {
    throw new Error("LiveKit webhook credentials are not configured");
  }

  return new WebhookReceiver(apiKey, apiSecret);
}

export async function createPreScreenLiveKitRoom(input: {
  roomName: string;
  metadata: Record<string, unknown>;
}) {
  const { apiKey, apiSecret, serverUrl } = getLiveKitConfig();

  if (!apiKey || !apiSecret || !serverUrl) {
    throw new Error("LiveKit room credentials are not configured");
  }

  const roomClient = new RoomServiceClient(serverUrl, apiKey, apiSecret);

  console.info("[pre-screen livekit] creating room", {
    roomName: input.roomName,
    config: getSafeLiveKitConfigSummary(),
  });

  try {
    await roomClient.createRoom({
      name: input.roomName,
      metadata: JSON.stringify(input.metadata),
      emptyTimeout: 60 * 10,
      maxParticipants: 10,
    });
  } catch (error) {
    console.error("[pre-screen livekit] room creation failed", {
      roomName: input.roomName,
      config: getSafeLiveKitConfigSummary(),
      error: toLoggableError(error),
    });
    throw error;
  }
}

export async function startPreScreenRoomRecording(input: { roomName: string; sessionId: string }) {
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
    fileType: EncodedFileType.MP4,
    filepath: `pre-screen-sessions/${input.sessionId}.mp4`,
    output: {
      case: "s3",
      value: s3Upload,
    },
  });

  console.info("[pre-screen livekit] starting room egress", {
    roomName: input.roomName,
    sessionId: input.sessionId,
    filePath: `pre-screen-sessions/${input.sessionId}.mp4`,
    config: getSafeLiveKitConfigSummary(),
  });

  let egressInfo;

  try {
    egressInfo = await egressClient.startRoomCompositeEgress(
      input.roomName,
      {
        file: fileOutput,
      },
      {
        audioOnly: true,
      },
    );
  } catch (error) {
    console.error("[pre-screen livekit] room egress start failed", {
      roomName: input.roomName,
      sessionId: input.sessionId,
      config: getSafeLiveKitConfigSummary(),
      error: toLoggableError(error),
    });
    throw error;
  }

  console.info("[pre-screen livekit] room egress started", {
    roomName: input.roomName,
    sessionId: input.sessionId,
    egressId: egressInfo.egressId,
  });

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

export function buildPreScreenRoomName(draftId: string) {
  const safeDraftId = draftId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24);
  return `pre_screen_${safeDraftId}_${Date.now()}`;
}

export function buildPreScreenParticipantIdentity(draftId: string) {
  const safeDraftId = draftId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24);
  return `pre_screen_user_${safeDraftId}`;
}

export function getPreScreenAgentType() {
  return PRE_SCREEN_AGENT_TYPE;
}
