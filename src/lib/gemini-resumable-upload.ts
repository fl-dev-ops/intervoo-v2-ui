import "server-only";

import { Readable } from "node:stream";

const GEMINI_UPLOAD_ENDPOINT =
  "https://generativelanguage.googleapis.com/upload/v1beta/files";
const GEMINI_FILES_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta";
const FILE_ACTIVE_POLL_INTERVAL_MS = 1_500;
const FILE_ACTIVE_POLL_TIMEOUT_MS = 120_000;
const MAX_UPLOAD_ATTEMPTS = 3;

export type UploadedGeminiFile = {
  name: string;
  uri: string;
  mimeType: string;
};

type UploadGeminiFileInput = {
  apiKey: string;
  contentLength: number;
  displayName: string;
  mimeType: string;
  openStream: (offset: number, signal?: AbortSignal) => Promise<Readable>;
  signal?: AbortSignal;
};

type GeminiFileResponse = {
  file?: {
    error?: { message?: unknown };
    mimeType?: unknown;
    name?: unknown;
    state?: unknown;
    uri?: unknown;
  };
};

type UploadedGeminiFileStatus = UploadedGeminiFile & {
  errorMessage: string | null;
  state: string | undefined;
};

type UploadSessionState =
  | { status: "active"; offset: number }
  | { status: "final"; file: UploadedGeminiFileStatus };

export async function uploadGeminiFileFromS3({
  apiKey,
  contentLength,
  displayName,
  mimeType,
  openStream,
  signal,
}: UploadGeminiFileInput): Promise<UploadedGeminiFile> {
  const uploadUrl = await createUploadSession({
    apiKey,
    contentLength,
    displayName,
    mimeType,
    signal,
  });

  let offset = 0;
  let lastFailure = "interrupted transfer";

  for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt += 1) {
    signal?.throwIfAborted();
    let source: Readable | undefined;
    let response: Response | undefined;

    try {
      source = await openStream(offset, signal);
      response = await fetch(uploadUrl, {
        body: Readable.toWeb(source) as ReadableStream,
        duplex: "half",
        headers: {
          "Content-Length": String(contentLength - offset),
          "X-Goog-Upload-Command": "upload, finalize",
          "X-Goog-Upload-Offset": String(offset),
        },
        method: "POST",
        signal,
      } as RequestInit & { duplex: "half" });
    } catch {
      signal?.throwIfAborted();
      lastFailure = "network interruption";
    } finally {
      source?.destroy();
    }

    if (response?.ok) {
      let uploaded: UploadedGeminiFileStatus | undefined;
      try {
        uploaded = parseUploadedFile(await response.json(), mimeType);
      } catch {
        signal?.throwIfAborted();
        lastFailure = "invalid final response";
      }
      if (uploaded) {
        return waitForGeminiFileActive({ apiKey, file: uploaded, signal });
      }
    } else if (response) {
      const status = response.status;
      await response.body?.cancel();
      if (!isRetryableStatus(status)) {
        throw new Error(`Gemini file upload was rejected (${status})`);
      }
      lastFailure = `retryable HTTP ${status}`;
    }

    const state = await queryUploadState(
      uploadUrl,
      contentLength,
      mimeType,
      signal,
    );
    if (state.status === "final") {
      return waitForGeminiFileActive({ apiKey, file: state.file, signal });
    }

    offset = state.offset;
    if (attempt < MAX_UPLOAD_ATTEMPTS) {
      await waitBeforeRetry(attempt, signal);
    }
  }

  throw new Error(`Gemini file upload failed after ${lastFailure}`);
}

async function waitForGeminiFileActive({
  apiKey,
  file,
  signal,
}: {
  apiKey: string;
  file: UploadedGeminiFileStatus;
  signal?: AbortSignal;
}): Promise<UploadedGeminiFile> {
  const deadline = Date.now() + FILE_ACTIVE_POLL_TIMEOUT_MS;
  let status = file;

  while (status.state !== "ACTIVE") {
    signal?.throwIfAborted();

    if (status.state === "FAILED") {
      throw new Error(
        `Gemini file processing failed: ${status.errorMessage ?? "unknown error"}`,
      );
    }
    if (Date.now() >= deadline) {
      throw new Error("Gemini file did not become ACTIVE before timeout");
    }

    await waitForDelay(FILE_ACTIVE_POLL_INTERVAL_MS, signal);
    status = await getGeminiFileStatus({ apiKey, file: status, signal });
  }

  return {
    mimeType: status.mimeType,
    name: status.name,
    uri: status.uri,
  };
}

async function getGeminiFileStatus({
  apiKey,
  file,
  signal,
}: {
  apiKey: string;
  file: UploadedGeminiFile;
  signal?: AbortSignal;
}): Promise<UploadedGeminiFileStatus> {
  const response = await fetch(`${GEMINI_FILES_ENDPOINT}/${file.name}`, {
    headers: { "x-goog-api-key": apiKey },
    signal,
  });

  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`Unable to check Gemini file status (${response.status})`);
  }

  return parseUploadedFile(await response.json(), file.mimeType);
}

async function createUploadSession({
  apiKey,
  contentLength,
  displayName,
  mimeType,
  signal,
}: Omit<UploadGeminiFileInput, "openStream">): Promise<string> {
  const response = await fetch(GEMINI_UPLOAD_ENDPOINT, {
    body: JSON.stringify({ file: { display_name: displayName } }),
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(contentLength),
      "X-Goog-Upload-Header-Content-Type": mimeType,
      "X-Goog-Upload-Protocol": "resumable",
    },
    method: "POST",
    signal,
  });

  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`Unable to start Gemini file upload (${response.status})`);
  }

  const uploadUrl = response.headers.get("x-goog-upload-url");
  if (!uploadUrl) {
    throw new Error("Gemini file upload session is unavailable");
  }

  return uploadUrl;
}

async function queryUploadState(
  uploadUrl: string,
  contentLength: number,
  mimeType: string,
  signal?: AbortSignal,
): Promise<UploadSessionState> {
  const response = await fetch(uploadUrl, {
    headers: {
      "Content-Length": "0",
      "X-Goog-Upload-Command": "query",
    },
    method: "POST",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Unable to resume Gemini file upload (${response.status})`);
  }

  const status = response.headers.get("x-goog-upload-status")?.toLowerCase();
  if (status === "final") {
    // Google's query protocol guarantees status/offset headers, not a resource
    // body. Recover metadata if Gemini supplies it; never replay a final session.
    const body = await response.text();
    if (body) {
      try {
        return { status, file: parseUploadedFile(JSON.parse(body), mimeType) };
      } catch {
        // A final query is terminal; replaying bytes would risk duplication.
      }
    }
    throw new Error(
      "Gemini upload finalized without recoverable file metadata",
    );
  }
  if (status !== "active") {
    throw new Error("Gemini returned an unknown upload session status");
  }

  const received = response.headers.get("x-goog-upload-size-received");
  const offset = received === null ? Number.NaN : Number(received);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset >= contentLength) {
    throw new Error("Gemini returned an invalid upload offset");
  }

  return { status, offset };
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

async function waitBeforeRetry(attempt: number, signal?: AbortSignal) {
  await waitForDelay(100 * 2 ** (attempt - 1), signal);
}

async function waitForDelay(delay: number, signal?: AbortSignal) {
  signal?.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, delay);
    const handleAbort = () => {
      clearTimeout(timeout);
      reject(signal?.reason ?? new Error("Resume parsing cancelled"));
    };

    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

function parseUploadedFile(
  value: unknown,
  fallbackMimeType: string,
): UploadedGeminiFileStatus {
  const response = value as GeminiFileResponse;
  const file =
    response.file ?? (value as NonNullable<GeminiFileResponse["file"]>);
  if (
    typeof file?.name !== "string" ||
    typeof file.uri !== "string" ||
    !file.name ||
    !file.uri
  ) {
    throw new Error("Gemini upload returned invalid file metadata");
  }

  return {
    errorMessage:
      typeof file.error?.message === "string" ? file.error.message : null,
    mimeType:
      typeof file.mimeType === "string" ? file.mimeType : fallbackMimeType,
    name: file.name,
    state: typeof file.state === "string" ? file.state : undefined,
    uri: file.uri,
  };
}
