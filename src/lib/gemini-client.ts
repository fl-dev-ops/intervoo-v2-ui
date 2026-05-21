import "server-only";

import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { FileState, GoogleGenAI } from "@google/genai";

const LOG_PREFIX = "[GeminiClient]";

export type GeminiUploadInputFile =
  | {
      kind: "url";
      presignedUrl: string;
      mimeType: string;
      displayName: string;
    }
  | {
      kind: "content";
      content: string;
      mimeType: string;
      displayName: string;
    };

export type UploadedGeminiFile = {
  name: string;
  uri: string | null;
  mimeType: string;
};

export type UploadedGeminiFileStatus = UploadedGeminiFile & {
  state: FileState | undefined;
  errorMessage: string | null;
};

export function getGeminiApiKey() {
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

async function writeContentToTempFile(content: string): Promise<string> {
  const tempPath = join(tmpdir(), `gemini-${randomUUID()}.json`);
  await writeFile(tempPath, content, "utf8");
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

export async function uploadGeminiFile(input: {
  file: GeminiUploadInputFile;
  requestId: string;
}): Promise<UploadedGeminiFile> {
  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  let tempFilePath: string | null = null;

  try {
    tempFilePath =
      input.file.kind === "url"
        ? await streamUrlToTempFile(input.file.presignedUrl)
        : await writeContentToTempFile(input.file.content);

    console.info(LOG_PREFIX, "File streamed to temp", {
      displayName: input.file.displayName,
      requestId: input.requestId,
    });

    const uploaded = await ai.files.upload({
      file: tempFilePath,
      config: {
        mimeType: input.file.mimeType,
        displayName: input.file.displayName,
      },
    });

    if (!uploaded.name) {
      throw new Error("Gemini upload returned no file name");
    }

    console.info(LOG_PREFIX, "Uploaded to Gemini", {
      requestId: input.requestId,
      fileName: uploaded.name,
      mimeType: input.file.mimeType,
      state: uploaded.state ?? null,
    });

    return {
      name: uploaded.name,
      uri: uploaded.uri ?? null,
      mimeType: input.file.mimeType,
    };
  } finally {
    if (tempFilePath) {
      await safeDelete(unlink(tempFilePath), "Temp file");
    }
  }
}

export async function uploadedGeminiFileStatus(
  file: UploadedGeminiFile,
): Promise<UploadedGeminiFileStatus> {
  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  const status = await ai.files.get({ name: file.name });

  return {
    name: file.name,
    uri: status.uri ?? file.uri,
    mimeType: file.mimeType,
    state: status.state,
    errorMessage: status.error?.message ?? null,
  };
}

export async function deleteGeminiFiles(files: UploadedGeminiFile[]) {
  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  for (const file of files) {
    await safeDelete(ai.files.delete({ name: file.name }), "Gemini file");
  }
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

export { FileState };
