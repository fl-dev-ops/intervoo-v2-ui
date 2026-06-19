import type { GenerateContentResponseUsageMetadata } from "@google/genai";

// gemini-2.5-flash paid-tier rates (USD per token).
// Source: https://ai.google.dev/gemini-api/docs/pricing
// NOTE: cost (not token counts) is only accurate while the report model is
// gemini-2.5-flash. If DIAGNOSTIC_REPORT_MODEL_ID is overridden, treat cost as
// approximate.
const TEXT_INPUT_RATE = 0.3 / 1_000_000;
const AUDIO_INPUT_RATE = 1.0 / 1_000_000;
const OUTPUT_RATE = 2.5 / 1_000_000; // includes thinking tokens

function modalityTokens(
  usage: GenerateContentResponseUsageMetadata | undefined,
  modality: "TEXT" | "AUDIO",
): number {
  const detail = usage?.promptTokensDetails?.find(
    (d) => d.modality === modality,
  );
  return detail?.tokenCount ?? 0;
}

/**
 * Builds a PostHog `$ai_generation` event property bag from a Gemini report
 * generation's usage metadata. Input is split into two native buckets (text =
 * prompt + transcript file, audio), and cost is computed with per-modality
 * rates because PostHog's auto-cost would price audio at the text rate.
 */
export function buildReportAiGenerationProps(input: {
  usage: GenerateContentResponseUsageMetadata | undefined;
  modelId: string;
  traceId: string;
}): Record<string, unknown> {
  const { usage, modelId, traceId } = input;

  const audioInputTokens = modalityTokens(usage, "AUDIO");
  const promptTokens = usage?.promptTokenCount ?? 0;
  // Text = everything in the prompt that isn't audio (prompt instructions +
  // transcript file). Prefer the reported TEXT modality, fall back to the
  // remainder so the two buckets always sum to promptTokenCount.
  const textInputTokens =
    modalityTokens(usage, "TEXT") ||
    Math.max(promptTokens - audioInputTokens, 0);

  const responseTokens = usage?.candidatesTokenCount ?? 0;
  const thinkingTokens = usage?.thoughtsTokenCount ?? 0;
  const outputTokens = responseTokens + thinkingTokens;

  const inputCostUsd =
    textInputTokens * TEXT_INPUT_RATE + audioInputTokens * AUDIO_INPUT_RATE;
  const outputCostUsd = outputTokens * OUTPUT_RATE;
  const totalCostUsd = inputCostUsd + outputCostUsd;

  return {
    // standard PostHog LLM analytics props
    $ai_trace_id: traceId,
    $ai_model: modelId,
    $ai_provider: "gemini",
    $ai_input_tokens: promptTokens,
    $ai_output_tokens: outputTokens,
    $ai_input_cost_usd: inputCostUsd,
    $ai_output_cost_usd: outputCostUsd,
    $ai_total_cost_usd: totalCostUsd,
    // custom modality / total breakdown
    ai_input_text_tokens: textInputTokens,
    ai_input_audio_tokens: audioInputTokens,
    ai_output_response_tokens: responseTokens,
    ai_output_thinking_tokens: thinkingTokens,
    ai_total_tokens: usage?.totalTokenCount ?? promptTokens + outputTokens,
  };
}
