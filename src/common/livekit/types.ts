export interface LiveKitConnectionDetails {
  sessionId: string;
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantIdentity: string;
  participantToken: string;
}

export type LiveKitTranscriptRole = "agent" | "user";

export type LiveKitTranscriptMessage = {
  id: string;
  participantIdentity: string;
  role: LiveKitTranscriptRole;
  text: string;
  timestamp: string;
};
