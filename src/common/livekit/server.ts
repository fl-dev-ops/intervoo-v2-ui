import {
  AccessToken,
  EgressClient,
  EncodedFileOutput,
  RoomServiceClient,
  S3Upload,
  WebhookReceiver,
  type VideoGrant,
} from "livekit-server-sdk";

export type LiveKitServerConfig = {
  apiKey?: string;
  apiSecret?: string;
  serverUrl?: string;
};

export function sanitizeLiveKitSeed(seed: string) {
  return seed.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20);
}

export function buildLiveKitRoomName(prefix: string, seed: string) {
  const safeSeed = sanitizeLiveKitSeed(seed);
  return `${prefix}_${safeSeed}_${Date.now()}`;
}

export function buildLiveKitParticipantIdentity(prefix: string, seed: string) {
  const safeSeed = sanitizeLiveKitSeed(seed);
  return `${prefix}_${safeSeed}_${Date.now()}`;
}

export function getLiveKitServerUrl(config: LiveKitServerConfig, notConfiguredMessage: string) {
  if (!config.serverUrl) {
    throw new Error(notConfiguredMessage);
  }

  return config.serverUrl;
}

export function createLiveKitWebhookReceiver(
  config: LiveKitServerConfig,
  notConfiguredMessage: string,
) {
  if (!config.apiKey || !config.apiSecret) {
    throw new Error(notConfiguredMessage);
  }

  return new WebhookReceiver(config.apiKey, config.apiSecret);
}

export async function createLiveKitRoom(input: {
  config: LiveKitServerConfig;
  roomName: string;
  metadata: Record<string, unknown>;
  notConfiguredMessage: string;
}) {
  const { apiKey, apiSecret, serverUrl } = input.config;

  if (!apiKey || !apiSecret || !serverUrl) {
    throw new Error(input.notConfiguredMessage);
  }

  const roomClient = new RoomServiceClient(serverUrl, apiKey, apiSecret);

  await roomClient.createRoom({
    name: input.roomName,
    metadata: JSON.stringify(input.metadata),
    emptyTimeout: 60 * 10,
    maxParticipants: 10,
  });
}

export async function createLiveKitToken(input: {
  config: LiveKitServerConfig;
  roomName: string;
  participantIdentity: string;
  participantName: string;
  ttl: string;
  notConfiguredMessage: string;
}) {
  const { apiKey, apiSecret } = input.config;

  if (!apiKey || !apiSecret) {
    throw new Error(input.notConfiguredMessage);
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: input.participantIdentity,
    name: input.participantName,
    ttl: input.ttl,
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

function getS3Upload() {
  const accessKey = process.env.S3_ACCESS_KEY;
  const secret = process.env.S3_SECRET_KEY;
  const region = process.env.S3_REGION;
  const bucket = process.env.S3_BUCKET;

  if (!accessKey || !secret || !region || !bucket) {
    throw new Error("S3 egress configuration is incomplete");
  }

  return new S3Upload({
    accessKey,
    secret,
    region,
    bucket,
    ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  });
}

export async function startLiveKitRoomRecording(input: {
  config: LiveKitServerConfig;
  roomName: string;
  sessionId: string;
  filePathPrefix: string;
  notConfiguredMessage: string;
}) {
  const { apiKey, apiSecret, serverUrl } = input.config;

  if (!apiKey || !apiSecret || !serverUrl) {
    throw new Error(input.notConfiguredMessage);
  }

  const egressClient = new EgressClient(serverUrl, apiKey, apiSecret);
  const fileOutput = new EncodedFileOutput({
    filepath: `${input.filePathPrefix}/${input.sessionId}.mp4`,
    output: {
      case: "s3",
      value: getS3Upload(),
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
