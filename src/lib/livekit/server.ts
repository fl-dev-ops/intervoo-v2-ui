import { AgentDispatchClient, RoomServiceClient } from "livekit-server-sdk";

type LiveKitServerConfig = {
  apiKey: string;
  apiSecret: string;
  serverUrl: string;
};

export function getLiveKitServerConfig(): LiveKitServerConfig {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const serverUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !serverUrl) {
    throw new Error("LiveKit credentials are not configured");
  }

  return {
    apiKey,
    apiSecret,
    serverUrl,
  };
}

export function createLiveKitRoomServiceClient() {
  const config = getLiveKitServerConfig();
  return new RoomServiceClient(config.serverUrl, config.apiKey, config.apiSecret);
}

export function createLiveKitAgentDispatchClient() {
  const config = getLiveKitServerConfig();
  return new AgentDispatchClient(config.serverUrl, config.apiKey, config.apiSecret);
}
