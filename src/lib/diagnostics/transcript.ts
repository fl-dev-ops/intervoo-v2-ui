import { asJsonObject } from "#/lib/prediagnostics/json-utils";

export type DiagnosticsTranscriptRole = "user" | "agent";

export type DiagnosticsTranscriptMessage = {
  id: string;
  role: DiagnosticsTranscriptRole;
  text: string;
  timestamp: string;
};

export type DiagnosticsSessionTranscript = {
  source: string;
  updatedAt: string;
  messages: DiagnosticsTranscriptMessage[];
};

const TRANSCRIPT_SOURCE = "livekit_diagnostics_client";

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

export function sanitizeDiagnosticsTranscriptMessages(
  messages: unknown,
): DiagnosticsTranscriptMessage[] {
  if (!Array.isArray(messages)) {
    return [];
  }

  const latestById = new Map<string, DiagnosticsTranscriptMessage>();

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

export function buildDiagnosticsSessionTranscript(
  messages: DiagnosticsTranscriptMessage[],
): DiagnosticsSessionTranscript {
  return {
    source: TRANSCRIPT_SOURCE,
    updatedAt: new Date().toISOString(),
    messages,
  };
}

export function getDiagnosticsSessionTranscriptMessages(
  transcript: unknown,
): DiagnosticsTranscriptMessage[] {
  const value = asJsonObject(transcript);
  return sanitizeDiagnosticsTranscriptMessages(value.messages);
}
