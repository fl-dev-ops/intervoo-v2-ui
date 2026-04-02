import type { TextStreamData } from "@livekit/components-react";
import type { LiveKitTranscriptMessage } from "#/common/livekit/types";

export function normalizeLiveKitTranscriptMessages(
  transcriptions: TextStreamData[],
  localIdentity?: string,
) {
  const latestByStreamId = new Map<string, LiveKitTranscriptMessage>();

  transcriptions.forEach((transcription, index) => {
    const text = transcription.text.trim();
    const participantIdentity = transcription.participantInfo.identity;

    if (!text || !participantIdentity) {
      return;
    }

    const streamId = transcription.streamInfo.id || `${participantIdentity}-${index}`;

    latestByStreamId.set(streamId, {
      id: streamId,
      participantIdentity,
      role: localIdentity && participantIdentity === localIdentity ? "user" : "agent",
      text,
      timestamp: new Date(transcription.streamInfo.timestamp).toISOString(),
    });
  });

  return Array.from(latestByStreamId.values()).sort((left, right) =>
    left.timestamp.localeCompare(right.timestamp),
  );
}
