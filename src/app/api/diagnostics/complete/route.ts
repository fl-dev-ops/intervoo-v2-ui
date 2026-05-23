import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserStage } from "@/lib/progress";
import {
  buildReportTranscriptPromptText,
  getReportTranscriptMessages,
  type ReportTranscriptMessage,
} from "@/lib/report-generation/transcript";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stage = await getUserStage(session.user.id);
    if (stage !== "DIAGNOSTICS" && stage !== "COMPLETED") {
      return NextResponse.json(
        { error: "Diagnostics are not available for this user stage" },
        { status: 409 },
      );
    }

    const body = (await request.json()) as {
      sessionId?: string;
      userTurnCount?: number;
      transcript?: {
        messages?: ReportTranscriptMessage[];
        turns?: ReportTranscriptMessage[];
      };
    };

    if (!body.sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const interviewSession = await prisma.interviewSession.findUnique({
      where: { id: body.sessionId },
      include: { diagnosticRound: true, report: true },
    });

    if (!interviewSession || interviewSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Merge transcripts
    const existingMessages = getReportTranscriptMessages(
      interviewSession.transcript,
    );
    const incomingMessages =
      body.transcript?.messages ?? body.transcript?.turns ?? [];

    const mergedMessages =
      incomingMessages.length > 0 ? incomingMessages : existingMessages;

    const transcriptPayload =
      mergedMessages.length > 0
        ? { messages: mergedMessages, source: "livekit_diagnostics_client" }
        : null;

    const transcript = buildReportTranscriptPromptText(transcriptPayload)
      ? transcriptPayload
      : interviewSession.transcript;

    await prisma.interviewSession.update({
      where: { id: interviewSession.id },
      data: {
        transcript: transcript ?? undefined,
        status: "COMPLETED",
        endedAt: new Date(),
      },
    });

    if (interviewSession.diagnosticRound) {
      await prisma.diagnosticRound.update({
        where: { id: interviewSession.diagnosticRound.id },
        data: { status: "COMPLETED" },
      });
    }

    if (!interviewSession.report) {
      const hasInsufficientTurns =
        body.userTurnCount != null && body.userTurnCount < 4;
      await prisma.report.create({
        data: {
          sessionId: interviewSession.id,
          status: hasInsufficientTurns ? "FAILED" : "PENDING",
          startedAt: new Date(),
          errorMessage: hasInsufficientTurns
            ? "Diagnostic report is unavailable because no relevant answers were provided"
            : null,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Diagnostics complete error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to complete diagnostic session",
      },
      { status: 500 },
    );
  }
}
