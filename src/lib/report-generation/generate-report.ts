import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output } from "ai";
import type { ZodTypeAny } from "zod";

const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  throw new Error("Missing OPENROUTER_API_KEY environment variable");
}

const openrouter = createOpenRouter({ apiKey });

type GenerateReportInput<Schema extends ZodTypeAny> = {
  prompt?: string;
  messages?: Array<{
    role: "system" | "user";
    content: Array<
      | { type: "text"; text: string }
      | { type: "file"; mediaType: string; url: string }
    >;
  }>;
  schema: Schema;
  system?: string;
  modelId?: string;
};

export async function generateReport<Schema extends ZodTypeAny>({
  prompt,
  messages,
  schema,
  system,
  modelId,
}: GenerateReportInput<Schema>) {
  const model = openrouter(
    modelId ?? process.env.OPENROUTER_MODEL ?? "openai/gpt-4o",
  );

  const result = await generateText({
    model,
    output: Output.object({ schema }),
    ...(messages ? { messages } : { prompt }),
    system,
  } as unknown as Parameters<typeof generateText>[0]);

  return result.output;
}
