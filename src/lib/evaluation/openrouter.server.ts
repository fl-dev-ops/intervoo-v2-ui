import { generateObject, type UserContent, type Schema } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export const EVALUATION_MODEL_ID = "google/gemini-2.5-flash";

function getOpenRouterModel() {
  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  return openrouter(EVALUATION_MODEL_ID);
}

export async function generateEvaluationObject<OBJECT>(input: {
  userContent: UserContent;
  schema: Schema<OBJECT>;
  temperature?: number;
}) {
  return generateObject({
    model: getOpenRouterModel(),
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
