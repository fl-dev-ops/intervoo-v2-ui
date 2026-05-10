export type TranscriptRole = "user" | "agent";

export type ReportTranscriptMessage = {
  id: string;
  role: TranscriptRole;
  text: string;
  timestamp: string | null;
  order: number;
};

type TranscriptMessage = ReportTranscriptMessage;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toIsoTimestamp(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === "number" || typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  return null;
}

function normalizeRole(value: unknown): TranscriptRole | null {
  if (typeof value !== "string") {
    return null;
  }

  const role = value.toLowerCase();

  if (role === "user" || role === "student") {
    return "user";
  }

  if (role === "agent" || role === "assistant") {
    return "agent";
  }

  return null;
}

function sanitizeMessages(messages: unknown): TranscriptMessage[] {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages.flatMap((message, index) => {
    const item = asRecord(message);
    const role = normalizeRole(item?.role);
    const text = typeof item?.text === "string" ? item.text.trim() : "";

    if (!item || !role || !text) {
      return [];
    }

    const rawId = typeof item.id === "string" ? item.id.trim() : "";
    const timestamp = toIsoTimestamp(item.timestamp);

    return [
      {
        id: rawId || `${role}-${timestamp || "unknown"}-${index}`,
        role,
        text,
        timestamp,
        order: index,
      },
    ];
  });
}

function sanitizeTurns(turns: unknown): TranscriptMessage[] {
  if (!Array.isArray(turns)) {
    return [];
  }

  return turns.flatMap((turn, index) => {
    const item = asRecord(turn);
    const role = normalizeRole(item?.role);
    const text = typeof item?.text === "string" ? item.text.trim() : "";

    if (!item || !role || !text) {
      return [];
    }

    const rawIndex = typeof item.index === "number" ? item.index : index;
    const timestamp = toIsoTimestamp(item.timestamp);

    return [
      {
        id: `${role}-${timestamp || "unknown"}-${rawIndex}`,
        role,
        text,
        timestamp,
        order: rawIndex,
      },
    ];
  });
}

export function getReportTranscriptMessages(transcript: unknown) {
  const value = asRecord(transcript);

  if (!value) {
    return [];
  }

  const messages = sanitizeMessages(value.messages);
  const turns = sanitizeTurns(value.turns);
  const resolved = messages.length > 0 ? messages : turns;

  return resolved.sort((left, right) => {
    if (left.timestamp && right.timestamp) {
      const byTimestamp = left.timestamp.localeCompare(right.timestamp);
      if (byTimestamp !== 0) {
        return byTimestamp;
      }
    }

    return left.order - right.order;
  });
}

export function buildReportTranscriptPromptText(transcript: unknown) {
  return getReportTranscriptMessages(transcript)
    .map((message, index) => {
      const speaker = message.role === "user" ? "Student" : "Agent";
      return `${index + 1}. [${message.timestamp || "unknown time"}] ${speaker}: ${message.text}`;
    })
    .join("\n");
}
