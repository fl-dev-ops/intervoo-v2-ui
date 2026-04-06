import { useMemo } from "react";
import { useChat, useSessionContext, useSessionMessages } from "@livekit/components-react";
import type { UseSessionReturn } from "@livekit/components-react";

export type PrediagnosticsMessage = {
  id: string;
  role: "user" | "agent";
  kind: "chat" | "transcript";
  text: string;
  timestamp: number;
};

function getTimestampValue(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

export function usePrediagnosticsMessages(session: UseSessionReturn) {
  const { room } = useSessionContext();
  const { messages } = useSessionMessages(session);
  const { chatMessages } = useChat();

  return useMemo(() => {
    const transcriptMessages = messages
      .filter((message) => message.type === "userTranscript" || message.type === "agentTranscript")
      .map((message) => ({
        id: message.id,
        role: message.type === "userTranscript" ? ("user" as const) : ("agent" as const),
        kind: "transcript" as const,
        text: message.message ?? "",
        timestamp: getTimestampValue(message.timestamp),
      }));

    const normalizedChatMessages = chatMessages.map((message) => ({
      id: message.id,
      role:
        message.from?.identity === room.localParticipant.identity
          ? ("user" as const)
          : ("agent" as const),
      kind: "chat" as const,
      text: message.message,
      timestamp: getTimestampValue(message.timestamp),
    }));

    return [...transcriptMessages, ...normalizedChatMessages].toSorted(
      (left, right) => left.timestamp - right.timestamp,
    );
  }, [chatMessages, messages, room.localParticipant.identity]);
}
