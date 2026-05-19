import "server-only";

import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { FileState, GoogleGenAI } from "@google/genai";
import { z } from "zod";

const FILE_ACTIVE_POLL_INTERVAL_MS = 1500;
const FILE_ACTIVE_POLL_TIMEOUT_MS = 120_000;

const LOG_PREFIX = "[GeminiClient]";

type GenerateFromUrlInput<Schema extends z.ZodTypeAny> = {
  modelId: string;
  presignedUrl: string;
  mimeType: string;
  prompt: string;
  schema: Schema;
  requestId: string;
  temperature?: number;
};

function getApiKey() {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return apiKey;
}

async function streamUrlToTempFile(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(
      `Failed to fetch file: ${response.status} ${response.statusText}`,
    );
  }

  const tempPath = join(tmpdir(), `gemini-${randomUUID()}.bin`);
  const nodeStream = Readable.fromWeb(
    response.body as Parameters<typeof Readable.fromWeb>[0],
  );
  await pipeline(nodeStream, createWriteStream(tempPath));
  return tempPath;
}

async function safeDelete(promise: Promise<unknown>, label: string) {
  try {
    await promise;
  } catch (error) {
    console.warn(LOG_PREFIX, `${label} cleanup failed (non-fatal)`, {
      error: error instanceof Error ? error.message : error,
    });
  }
}

function sanitizeJsonSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map((item) => sanitizeJsonSchema(item));
  }
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(
    schema as Record<string, unknown>,
  )) {
    if (key === "$schema") continue;
    out[key] = sanitizeJsonSchema(value);
  }
  return out;
}

export async function generateContentFromUrl<Schema extends z.ZodTypeAny>(
  input: GenerateFromUrlInput<Schema>,
): Promise<z.infer<Schema>> {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  let tempFilePath: string | null = null;
  let geminiFileName: string | null = null;

  try {
    tempFilePath = await streamUrlToTempFile(input.presignedUrl);
    console.info(LOG_PREFIX, "File streamed to temp", {
      requestId: input.requestId,
    });

    let uploaded = await ai.files.upload({
      file: tempFilePath,
      config: {
        mimeType: input.mimeType,
        displayName: input.requestId,
      },
    });

    geminiFileName = uploaded.name ?? null;
    console.info(LOG_PREFIX, "Uploaded to Gemini, awaiting ACTIVE", {
      requestId: input.requestId,
      fileName: geminiFileName,
    });

    const deadline = Date.now() + FILE_ACTIVE_POLL_TIMEOUT_MS;
    while (uploaded.state === FileState.PROCESSING) {
      if (Date.now() > deadline) {
        throw new Error("Gemini file did not become ACTIVE before timeout");
      }
      await new Promise((resolve) =>
        setTimeout(resolve, FILE_ACTIVE_POLL_INTERVAL_MS),
      );
      if (!uploaded.name) {
        throw new Error("Gemini upload returned no file name");
      }
      uploaded = await ai.files.get({ name: uploaded.name });
    }

    if (uploaded.state === FileState.FAILED) {
      throw new Error(
        `Gemini file processing failed: ${uploaded.error?.message ?? "unknown error"}`,
      );
    }
    if (!uploaded.uri) {
      throw new Error("Gemini upload returned no file URI");
    }

    console.info(LOG_PREFIX, "Generating content", {
      requestId: input.requestId,
      modelId: input.modelId,
    });

    const result = await ai.models.generateContent({
      model: input.modelId,
      contents: [
        {
          role: "user",
          parts: [
            { text: input.prompt },
            {
              fileData: {
                fileUri: uploaded.uri,
                mimeType: input.mimeType,
              },
            },
          ],
        },
      ],
      config: {
        temperature: input.temperature ?? 0,
        responseMimeType: "application/json",
        responseJsonSchema: sanitizeJsonSchema(z.toJSONSchema(input.schema)),
      },
    });

    const text = result.text;
    if (!text) {
      throw new Error("Gemini returned an empty response");
    }

    const parsed = JSON.parse(text);
    return input.schema.parse(parsed) as z.infer<Schema>;
  } finally {
    if (geminiFileName) {
      await safeDelete(
        ai.files.delete({ name: geminiFileName }),
        "Gemini file",
      );
    }
    if (tempFilePath) {
      await safeDelete(unlink(tempFilePath), "Temp file");
    }
  }
}
