import "server-only";

import { generateContentFromUrl } from "@/lib/gemini-client";
import type { DiagnosticQuestion } from "./diagnostic-activity";
import { createDiagnosticReportGenerationSchema } from "./diagnostic-schema";

export const DEFAULT_DIAGNOSTIC_REPORT_MODEL_ID = "gemini-2.5-flash";

type GenerateDiagnosticReportWithGeminiInput = {
  sessionId: string;
  audioUrl: string;
  mimeType: string;
  prompt: string;
  questions: DiagnosticQuestion[];
};

export async function generateDiagnosticReportWithGemini(
  input: GenerateDiagnosticReportWithGeminiInput,
) {
  const modelId =
    process.env.DIAGNOSTIC_REPORT_MODEL_ID ??
    DEFAULT_DIAGNOSTIC_REPORT_MODEL_ID;
  const schema = createDiagnosticReportGenerationSchema(input.questions);

  return generateContentFromUrl({
    modelId,
    presignedUrl: input.audioUrl,
    mimeType: input.mimeType,
    prompt: input.prompt,
    schema,
    requestId: `diagnostic-${input.sessionId}`,
  });
}

export function getRecordingMimeType(url: string) {
  const normalized = url.toLowerCase();

  if (normalized.includes(".mp3")) return "audio/mpeg";
  if (normalized.includes(".mp4")) return "audio/mp4";
  if (normalized.includes(".m4a")) return "audio/mp4";
  if (normalized.includes(".webm")) return "audio/webm";
  if (normalized.includes(".wav")) return "audio/wav";

  return "audio/mpeg";
}
