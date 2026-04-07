import { generateObject, type UserContent, type Schema } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export const EVALUATION_MODEL_ID = "google/gemini-2.5-flash";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function generateEvaluationObject<OBJECT>(input: {
  userContent: UserContent;
  schema: Schema<OBJECT>;
  temperature?: number;
}) {
  return generateObject({
    model: openrouter(EVALUATION_MODEL_ID),
    schema: input.schema,
    messages: [
      {
        role: "user",
        content: input.userContent,
      },
    ],
    temperature: input.temperature ?? 0,
  });
}
