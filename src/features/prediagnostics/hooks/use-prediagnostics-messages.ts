import { useMemo, useRef } from "react";
import {
  useChat,
  useSessionContext,
  useSessionMessages,
  type UseSessionReturn,
} from "#/shared/livekit";

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

export function mergePrediagnosticsMessages(
  persistedMessages: PrediagnosticsMessage[],
  incomingMessages: PrediagnosticsMessage[],
) {
  const nextMessages = [...persistedMessages];
  const indexById = new Map(nextMessages.map((message, index) => [message.id, index]));

  for (const message of incomingMessages) {
    const existingIndex = indexById.get(message.id);

    if (existingIndex === undefined) {
      indexById.set(message.id, nextMessages.length);
      nextMessages.push(message);
      continue;
    }

    nextMessages[existingIndex] = message;
  }

  return nextMessages;
}

export function usePrediagnosticsMessages(
  session: UseSessionReturn,
  initialMessages: PrediagnosticsMessage[] = [],
) {
  const { room } = useSessionContext();
  const { messages } = useSessionMessages(session);
  const { chatMessages } = useChat();
  const persistedRef = useRef<PrediagnosticsMessage[]>([...initialMessages]);

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

    const merged = [...transcriptMessages, ...normalizedChatMessages];

    // Keep prior messages across reconnects, but allow LiveKit to replace
    // transcript segments as partial/final text arrives for the same id.
    persistedRef.current = mergePrediagnosticsMessages(persistedRef.current, merged);

    return [...persistedRef.current].toSorted(
      (left: PrediagnosticsMessage, right: PrediagnosticsMessage) =>
        left.timestamp - right.timestamp,
    );
  }, [chatMessages, messages, room.localParticipant.identity]);
}
