import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import type { ZodTypeAny } from "zod";

const apiKey = process.env.OPENROUTER_API_KEY;
const modelName = process.env.OPENROUTER_MODEL || "openai/gpt-4o";

if (!apiKey) {
  throw new Error("Missing OPENROUTER_API_KEY environment variable");
}

const openrouter = createOpenRouter({ apiKey });
const model = openrouter(modelName);

type GenerateReportInput<Schema extends ZodTypeAny> = {
  prompt: string;
  schema: Schema;
  system?: string;
};

export async function generateReport<Schema extends ZodTypeAny>({
  prompt,
  schema,
  system,
}: GenerateReportInput<Schema>) {
  const result = await generateObject({
    model,
    schema,
    prompt,
    system,
  });

  return result.object;
}
