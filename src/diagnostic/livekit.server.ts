import {
  buildLiveKitParticipantIdentity,
  buildLiveKitRoomName,
  createLiveKitRoom,
  createLiveKitToken,
  getLiveKitServerUrl,
  startLiveKitRoomRecording,
  type LiveKitServerConfig,
} from "#/common/livekit/server";

function getDiagnosticLiveKitConfig(): LiveKitServerConfig {
  return {
    apiKey: process.env.DIAGNOSTIC_LIVEKIT_API_KEY,
    apiSecret: process.env.DIAGNOSTIC_LIVEKIT_API_SECRET,
    serverUrl: process.env.DIAGNOSTIC_LIVEKIT_URL,
  };
}

export function getDiagnosticLiveKitServerUrl() {
  return getLiveKitServerUrl(
    getDiagnosticLiveKitConfig(),
    "DIAGNOSTIC_LIVEKIT_URL is not configured",
  );
}

export async function createDiagnosticLiveKitRoom(input: {
  roomName: string;
  metadata: Record<string, unknown>;
}) {
  await createLiveKitRoom({
    config: getDiagnosticLiveKitConfig(),
    roomName: input.roomName,
    metadata: input.metadata,
    notConfiguredMessage: "Diagnostic LiveKit room credentials are not configured",
  });
}

export async function createDiagnosticLiveKitToken(input: {
  roomName: string;
  participantIdentity: string;
  participantName: string;
}) {
  return await createLiveKitToken({
    config: getDiagnosticLiveKitConfig(),
    roomName: input.roomName,
    participantIdentity: input.participantIdentity,
    participantName: input.participantName,
    ttl: "30m",
    notConfiguredMessage: "Diagnostic LiveKit credentials are not configured",
  });
}

export async function startDiagnosticRoomRecording(input: { roomName: string; sessionId: string }) {
  return await startLiveKitRoomRecording({
    config: getDiagnosticLiveKitConfig(),
    roomName: input.roomName,
    sessionId: input.sessionId,
    filePathPrefix: "diagnostic-sessions",
    notConfiguredMessage: "Diagnostic LiveKit egress credentials are not configured",
  });
}

export function buildDiagnosticRoomName(seed: string) {
  return buildLiveKitRoomName("diag", seed);
}

export function buildDiagnosticParticipantIdentity(seed: string) {
  return buildLiveKitParticipantIdentity("diag_user", seed);
}
