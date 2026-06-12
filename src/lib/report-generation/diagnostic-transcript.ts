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

function normalizeQuestionText(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/\s+/g, " ")
    : "";
}

function toDiagnosticQuestion(value: unknown): DiagnosticQuestion | null {
  if (!value || typeof value !== "object") return null;
  const q = value as Record<string, unknown>;

  const id = typeof q.id === "string" ? q.id : "";
  const text = typeof q.text === "string" ? q.text : "";
  const question_type = normalizeQuestionTypes(q.question_type);
  if (!id || !text || !question_type.length) return null;

  return {
    id,
    text,
    question_type,
    category: typeof q.category === "string" ? q.category : undefined,
    difficulty_level:
      typeof q.difficulty_level === "string" ? q.difficulty_level : undefined,
    band: typeof q.band === "number" ? q.band : undefined,
  };
}

/**
 * Build the asked-questions list from client-captured `diagnostic_question_started`
 * events stored on `session.metadata.asked_questions`. Each captured question is
 * reconciled against the generated set (`session.metadata.questions`) — matched by
 * id, then by normalized text — to recover `id` + `question_type` even when the
 * event payload only carried `text`. Returns [] when nothing usable is present.
 */
export function extractAskedQuestionsFromMetadata(
  askedQuestions: unknown,
  generatedQuestions: unknown,
): DiagnosticQuestion[] {
  if (!Array.isArray(askedQuestions) || !askedQuestions.length) return [];

  const generated = Array.isArray(generatedQuestions)
    ? (generatedQuestions
        .map(toDiagnosticQuestion)
        .filter((q): q is DiagnosticQuestion => q !== null))
    : [];
  const byId = new Map(generated.map((q) => [q.id, q]));
  const byText = new Map(generated.map((q) => [normalizeQuestionText(q.text), q]));

  const result: DiagnosticQuestion[] = [];
  const seen = new Set<string>();

  for (const raw of askedQuestions) {
    if (!raw || typeof raw !== "object") continue;
    const q = raw as Record<string, unknown>;

    const id = typeof q.id === "string" ? q.id : "";
    const textKey = normalizeQuestionText(q.text);

    const matched =
      (id && byId.get(id)) || (textKey && byText.get(textKey)) || null;
    const resolved = matched ?? toDiagnosticQuestion(raw);
    if (!resolved) continue;

    if (seen.has(resolved.id)) continue;
    seen.add(resolved.id);
    result.push(resolved);
  }

  return result;
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
