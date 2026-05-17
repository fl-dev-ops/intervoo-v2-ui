import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateSessionReport } from "@/lib/report-generation/session-report";

const secret = process.env.REPORT_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    if (secret && token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      room_name?: string;
      roomName?: string;
      audio_url?: string;
      transcript_url?: string;
      video_url?: string;
      transcript?: object;
      duration_ms?: number;
      status?: string;
      sessionId?: string;
    };

    const roomName = body.room_name || body.roomName;
    const sessionId = body.sessionId;

    if (!roomName && !sessionId) {
      return NextResponse.json(
        { error: "Missing room_name or sessionId" },
        { status: 400 },
      );
    }

    const whereClause = sessionId
      ? { id: sessionId }
      : { roomName: roomName || "" };

    const session = await prisma.interviewSession.findUnique({
      where: whereClause,
      include: { report: true },
    });

    console.info("[diagnostics] report webhook request", {
      foundSession: Boolean(session),
      roomName: roomName ?? null,
      sessionId: session?.id ?? sessionId ?? null,
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Update session with media URLs and transcript from agent payload.
    try {
      await prisma.interviewSession.update({
        where: { id: session.id },
        data: {
          audioUrl: body.audio_url || undefined,
          transcriptUrl: body.transcript_url || undefined,
          videoUrl: body.video_url || undefined,
          transcript: body.transcript || undefined,
          status: "COMPLETED",
          endedAt: session.endedAt ?? new Date(),
        },
      });

      if (session.type === "DIAGNOSTIC_ROUND") {
        await prisma.diagnosticRound.updateMany({
          where: { sessionId: session.id, status: "STARTED" },
          data: { status: "COMPLETED" },
        });
      }
    } catch (updateError) {
      console.warn("Failed to update session URLs:", updateError);
    }

    try {
      const baseUrl = process.env.WEBHOOK_BASE_URL || request.nextUrl.origin;
      await generateSessionReport({ baseUrl, sessionId: session.id });
      console.info("[diagnostics] report webhook generated report", {
        sessionId: session.id,
        sessionType: session.type,
      });
    } catch (generationError) {
      const message =
        generationError instanceof Error
          ? generationError.message
          : "Report generation failed";

      console.error("Report generation failed:", generationError);

      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Report generation endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
