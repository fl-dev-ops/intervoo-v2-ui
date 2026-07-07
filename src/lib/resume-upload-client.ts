import { readNdjsonStream } from "@/lib/ndjson-stream";
import type {
  OnboardingResumeStreamEvent,
  ResumeData,
} from "@/lib/resume-client";

type ResumeUploadResult = {
  resume: ResumeData;
  resumeUrl: string;
};

type ResumeUploadOptions = {
  onEvent?: (event: OnboardingResumeStreamEvent) => Promise<void> | void;
};

export const PENDING_RESUME_STORAGE_KEY = "intervoo:pending-resume-key";

export async function uploadAndParseResume(
  file: File,
  options: ResumeUploadOptions = {},
): Promise<ResumeUploadResult> {
  const resumeUrl = await uploadResume(file);
  return parseUploadedResume(resumeUrl, options);
}

export async function uploadResume(file: File): Promise<string> {
  const uploadUrlResponse = await fetch("/api/onboarding/resume-upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    }),
  });
  if (!uploadUrlResponse.ok) {
    const error = await uploadUrlResponse.json();
    throw new Error(error.error || "Failed to prepare resume upload");
  }

  const upload = (await uploadUrlResponse.json()) as {
    resumeUrl: string;
    uploadUrl: string;
  };
  const uploadResponse = await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!uploadResponse.ok) {
    throw new Error("Failed to upload resume");
  }

  return upload.resumeUrl;
}

export async function parseUploadedResume(
  resumeUrl: string,
  options: ResumeUploadOptions = {},
): Promise<ResumeUploadResult> {
  const parseResponse = await fetch("/api/onboarding/parse-resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resumeUrl }),
  });
  if (!parseResponse.ok) {
    const error = await parseResponse.json();
    throw new Error(error.error || "Failed to parse resume");
  }
  if (!parseResponse.body) {
    throw new Error("Resume parser returned no response stream");
  }

  let result: ResumeUploadResult | null = null;

  for await (const event of readNdjsonStream<OnboardingResumeStreamEvent>(
    parseResponse.body,
  )) {
    if (event.type === "error") throw new Error(event.error);
    await options.onEvent?.(event);

    if (event.type === "complete") {
      result = {
        resume: event.resume,
        resumeUrl: event.resumeUrl ?? resumeUrl,
      };
    }
  }

  if (!result) throw new Error("Resume parsing did not complete");
  return result;
}
