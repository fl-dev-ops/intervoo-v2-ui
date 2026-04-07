import { asJsonObject } from "#/lib/prediagnostics/json-utils";

export type PrediagnosticsTranscriptRole = "user" | "agent";

export type PrediagnosticsTranscriptMessage = {
  id: string;
  role: PrediagnosticsTranscriptRole;
  text: string;
  timestamp: string;
};

export type PrediagnosticsSessionTranscript = {
  source: string;
  updatedAt: string;
  messages: PrediagnosticsTranscriptMessage[];
};

const TRANSCRIPT_SOURCE = "livekit_prediagnostics_client";

function toIsoTimestamp(value: unknown) {
  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  return null;
}

export function sanitizePrediagnosticsTranscriptMessages(
  messages: unknown,
): PrediagnosticsTranscriptMessage[] {
  if (!Array.isArray(messages)) {
    return [];
  }

  const latestById = new Map<string, PrediagnosticsTranscriptMessage>();

  messages.forEach((message, index) => {
    const item = asJsonObject(message);
    const role = item.role;
    const text = typeof item.text === "string" ? item.text.trim() : "";
    const timestamp = toIsoTimestamp(item.timestamp);
    const rawId = typeof item.id === "string" ? item.id.trim() : "";

    if ((role !== "agent" && role !== "user") || !text || !timestamp) {
      return;
    }

    const id = rawId || `${role}-${timestamp}-${index}`;

    latestById.set(id, {
      id,
      role,
      text,
      timestamp,
    });
  });

  return Array.from(latestById.values()).toSorted((left, right) =>
    left.timestamp.localeCompare(right.timestamp),
  );
}

export function buildPrediagnosticsSessionTranscript(
  messages: PrediagnosticsTranscriptMessage[],
): PrediagnosticsSessionTranscript {
  return {
    source: TRANSCRIPT_SOURCE,
    updatedAt: new Date().toISOString(),
    messages,
  };
}

export function getPrediagnosticsSessionTranscriptMessages(
  transcript: unknown,
): PrediagnosticsTranscriptMessage[] {
  const value = asJsonObject(transcript);
  return sanitizePrediagnosticsTranscriptMessages(value.messages);
}

export function buildPrediagnosticsTranscriptPromptText(
  messages: PrediagnosticsTranscriptMessage[],
) {
  return messages
    .map((message, index) => {
      const speaker = message.role === "user" ? "Student" : "Agent";
      return `${index + 1}. [${message.timestamp}] ${speaker}: ${message.text}`;
    })
    .join("\n");
}
