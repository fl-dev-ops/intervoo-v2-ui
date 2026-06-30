import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createNdjsonStreamResponse } from "@/lib/ndjson-stream";
import {
  type OnboardingResumeStreamEvent,
  streamOnboardingResume,
} from "@/lib/resume-client";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a PDF, DOC, or DOCX file." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 },
      );
    }

    return createNdjsonStreamResponse<OnboardingResumeStreamEvent>(
      streamOnboardingResume(file),
      {
        signal: request.signal,
        errorEvent(error) {
          console.error("Resume parse stream error:", error);
          return { type: "error", error: "Failed to parse resume" };
        },
      },
    );
  } catch (error) {
    console.error("Resume parse error:", error);

    return NextResponse.json(
      { error: "Failed to parse resume" },
      { status: 500 },
    );
  }
}
