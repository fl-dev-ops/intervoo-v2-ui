import type {
  DiagnosticQuestion,
  DiagnosticQuestionType,
} from "./diagnostic-activity";
import type { DiagnosticTranscriptMessage } from "./diagnostic-report.types";

export interface TranscriptUrlJson {
  schema_version?: string;
  session?: {
    agent_type?: string;
    room?: string;
    started_at?: string;
    ended_at?: string;
    duration_seconds?: number;
  };
  turns?: Array<{
    index: number;
    role: string;
    text: string;
    timestamp: string;
  }>;
  tools?: {
    calls?: Array<{
      name: string;
      arguments?: string;
      output?: string;
      is_error?: boolean;
    }>;
  };
}

function parsePythonishJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    try {
      const normalized = value
        .replace(/'/g, '"')
        .replace(/True/g, "true")
        .replace(/False/g, "false")
        .replace(/None/g, "null");
      return JSON.parse(normalized);
    } catch {
      return null;
    }
  }
}

function normalizeQuestionTypes(value: unknown): DiagnosticQuestionType[] {
  const valid: DiagnosticQuestionType[] = ["Language", "Thinking", "Confidence"];
  if (Array.isArray(value)) {
    return value.filter(
      (v): v is DiagnosticQuestionType =>
        typeof v === "string" && valid.includes(v as DiagnosticQuestionType),
    );
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter((s): s is DiagnosticQuestionType =>
        valid.includes(s as DiagnosticQuestionType),
      );
  }
  return [];
}

export async function fetchTranscriptFromUrl(
  url: string | null | undefined,
): Promise<TranscriptUrlJson | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as TranscriptUrlJson;
  } catch {
    return null;
  }
}

export function extractTranscriptMessages(
  json: TranscriptUrlJson | null,
): DiagnosticTranscriptMessage[] {
  if (!json?.turns?.length) return [];
  return json.turns
    .map((turn) => ({
      id: String(turn.index),
      participantIdentity: turn.role === "user" ? "user" : "agent",
      role:
        turn.role === "user"
          ? ("user" as const)
          : ("agent" as const),
      text: turn.text,
      timestamp: turn.timestamp,
    }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function extractRetrievedQuestions(
  json: TranscriptUrlJson | null,
): DiagnosticQuestion[] {
  if (!json?.tools?.calls?.length) return [];

  const questions: DiagnosticQuestion[] = [];
  const seen = new Set<string>();

  for (const call of json.tools.calls) {
    if (call.name !== "mark_question_started") continue;

    let parsedOutput: unknown = null;
    if (typeof call.output === "string") {
      parsedOutput = parsePythonishJson(call.output);
    }

    if (!parsedOutput || typeof parsedOutput !== "object") continue;
    const out = parsedOutput as Record<string, unknown>;

    const questionObj =
      out.question && typeof out.question === "object"
        ? (out.question as Record<string, unknown>)
        : out;

    const id =
      typeof questionObj.id === "string"
        ? questionObj.id
        : typeof out.question_id === "string"
          ? out.question_id
          : "";

    const text =
      typeof questionObj.text === "string"
        ? questionObj.text
        : typeof out.question_text === "string"
          ? out.question_text
          : "";

    const question_type = normalizeQuestionTypes(questionObj.question_type);

    if (!id || !text || !question_type.length) continue;
    if (seen.has(id)) continue;
    seen.add(id);

    questions.push({
      id,
      text,
      question_type,
      category:
        typeof questionObj.category === "string"
          ? questionObj.category
          : undefined,
      difficulty_level:
        typeof questionObj.difficulty_level === "string"
          ? questionObj.difficulty_level
          : undefined,
      band:
        typeof questionObj.band === "number" ? questionObj.band : undefined,
    });
  }

  return questions;
}
