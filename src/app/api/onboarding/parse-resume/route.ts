import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createNdjsonStreamResponse } from "@/lib/ndjson-stream";
import {
  type OnboardingResumeStreamEvent,
  streamOnboardingResume,
} from "@/lib/resume-client";
import { upsertParsedResumeForUser } from "@/lib/resume-persistence";
import { getResumeFile } from "@/lib/s3";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { resumeUrl?: unknown };
    const resumeUrl =
      typeof body.resumeUrl === "string" ? body.resumeUrl.trim() : "";
    if (!resumeUrl) {
      return NextResponse.json(
        { error: "Missing resume file" },
        { status: 400 },
      );
    }

    const file = await getResumeFile({
      key: resumeUrl,
      userId: session.user.id,
    });

    const events = persistParsedResume(
      streamOnboardingResume(file, resumeUrl, request.signal),
      session.user.id,
    );

    return createNdjsonStreamResponse<OnboardingResumeStreamEvent>(events, {
      signal: request.signal,
      errorEvent(error) {
        console.error("Resume parse stream error:", error);
        return { type: "error", error: "Failed to parse resume" };
      },
    });
  } catch (error) {
    console.error("Resume parse error:", error);

    return NextResponse.json(
      { error: "Failed to parse resume" },
      { status: 500 },
    );
  }
}

async function* persistParsedResume(
  events: AsyncIterable<OnboardingResumeStreamEvent>,
  userId: string,
): AsyncGenerator<OnboardingResumeStreamEvent> {
  for await (const event of events) {
    if (event.type === "complete") {
      await upsertParsedResumeForUser(userId, event.resume);
    }

    yield event;
  }
}
