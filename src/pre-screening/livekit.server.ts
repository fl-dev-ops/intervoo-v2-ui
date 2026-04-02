import {
  buildLiveKitParticipantIdentity,
  buildLiveKitRoomName,
  createLiveKitRoom,
  createLiveKitToken,
  createLiveKitWebhookReceiver,
  getLiveKitServerUrl,
  startLiveKitRoomRecording,
  type LiveKitServerConfig,
} from "#/common/livekit/server";

function getPreScreeningLiveKitConfig(): LiveKitServerConfig {
  return {
    apiKey: process.env.LIVEKIT_API_KEY,
    apiSecret: process.env.LIVEKIT_API_SECRET,
    serverUrl: process.env.LIVEKIT_URL,
  };
}

export function getPreScreeningLiveKitServerUrl() {
  return getLiveKitServerUrl(getPreScreeningLiveKitConfig(), "LIVEKIT_URL is not configured");
}

export async function createPreScreeningLiveKitRoom(input: {
  roomName: string;
  metadata: Record<string, unknown>;
}) {
  await createLiveKitRoom({
    config: getPreScreeningLiveKitConfig(),
    roomName: input.roomName,
    metadata: input.metadata,
    notConfiguredMessage: "LiveKit room credentials are not configured",
  });
}

export function getPreScreenWebhookReceiver() {
  return createLiveKitWebhookReceiver(
    getPreScreeningLiveKitConfig(),
    "LiveKit webhook credentials are not configured",
  );
}

export async function createPreScreeningLiveKitToken(input: {
  roomName: string;
  participantIdentity: string;
  participantName: string;
}) {
  return await createLiveKitToken({
    config: getPreScreeningLiveKitConfig(),
    roomName: input.roomName,
    participantIdentity: input.participantIdentity,
    participantName: input.participantName,
    ttl: "15m",
    notConfiguredMessage: "LiveKit credentials are not configured",
  });
}

export async function startPreScreeningRoomRecording(input: {
  roomName: string;
  sessionId: string;
}) {
  return await startLiveKitRoomRecording({
    config: getPreScreeningLiveKitConfig(),
    roomName: input.roomName,
    sessionId: input.sessionId,
    filePathPrefix: "pre-screen-sessions",
    notConfiguredMessage: "LiveKit egress credentials are not configured",
  });
}

export function shouldAllowUnverifiedLiveKitWebhook() {
  return (
    process.env.NODE_ENV !== "production" && process.env.LIVEKIT_WEBHOOK_ALLOW_UNVERIFIED === "true"
  );
}

export function buildPreScreeningRoomName(seed: string) {
  return buildLiveKitRoomName("pre_screen", seed);
}

export function buildPreScreeningParticipantIdentity(seed: string) {
  return buildLiveKitParticipantIdentity("pre_screen_user", seed);
}
