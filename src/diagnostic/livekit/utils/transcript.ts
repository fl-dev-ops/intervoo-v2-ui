import type { TextStreamData } from "@livekit/components-react";

export interface PreScreenTranscriptMessage {
  id: string;
  participantIdentity: string;
  role: "agent" | "user";
  text: string;
  timestamp: string;
}

export function normalizePreScreenTranscriptMessages(
  transcriptions: TextStreamData[],
  localIdentity?: string,
) {
  const latestByStreamId = new Map<string, PreScreenTranscriptMessage>();

  transcriptions.forEach((transcription, index) => {
    const participantIdentity = transcription.participantInfo.identity;
    const streamId = transcription.streamInfo.id || `${participantIdentity}-${index}`;
    const timestamp = new Date(transcription.streamInfo.timestamp).toISOString();

    latestByStreamId.set(streamId, {
      id: streamId,
      participantIdentity,
      role: localIdentity && participantIdentity === localIdentity ? "user" : "agent",
      text: transcription.text,
      timestamp,
    });
  });

  return Array.from(latestByStreamId.values()).sort((left, right) =>
    left.timestamp.localeCompare(right.timestamp),
  );
}

export function buildPreScreenTranscriptSummary(messages: PreScreenTranscriptMessage[]) {
  return {
    totalTurns: messages.length,
    userTurns: messages.filter((message) => message.role === "user").length,
    agentTurns: messages.filter((message) => message.role === "agent").length,
    startedAt: messages[0]?.timestamp ?? null,
    endedAt: messages[messages.length - 1]?.timestamp ?? null,
  };
}
