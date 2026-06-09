import { type NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";
import { WorkflowRunFailedError } from "workflow/internal/errors";
import { prisma } from "@/lib/db";
import { generateDiagnosticSessionReportWorkflow } from "@/workflows/diagnostic-report";

const INSUFFICIENT_SPEECH_ERROR =
  "Diagnostic report is unavailable because no relevant answers were provided";

function countUserTurns(transcript: unknown): number {
  if (
    !transcript ||
    typeof transcript !== "object" ||
    Array.isArray(transcript)
  ) {
    return 0;
  }
  const obj = transcript as Record<string, unknown>;
  const messages = (obj.messages ?? obj.turns) as
    | Array<Record<string, unknown>>
    | undefined;
  if (!Array.isArray(messages)) return 0;
  return messages.filter((m) => m.role === "user" || m.role === "student")
    .length;
}

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

    const baseUrl = process.env.WEBHOOK_BASE_URL || request.nextUrl.origin;

    if (session.type === "DIAGNOSTIC_ROUND") {
      const userTurnCount = countUserTurns(body.transcript);
      console.info("[diagnostics] report webhook user turn count", {
        userTurnCount,
        sessionId: session.id,
      });

      if (userTurnCount < 4) {
        if (!session.report) {
          await prisma.report.create({
            data: {
              sessionId: session.id,
              status: "FAILED",
              startedAt: new Date(),
              errorMessage: INSUFFICIENT_SPEECH_ERROR,
            },
          });
        } else {
          await prisma.report.update({
            where: { sessionId: session.id },
            data: {
              status: "FAILED",
              errorMessage: INSUFFICIENT_SPEECH_ERROR,
            },
          });
        }

        console.info("[diagnostics] report webhook insufficient turns", {
          sessionId: session.id,
          userTurnCount,
        });

        return NextResponse.json({
          success: true,
          result: "skipped_insufficient_turns",
        });
      }

      const run = await start(generateDiagnosticSessionReportWorkflow, [
        session.id,
        baseUrl,
      ]);
      const result = await getReportWorkflowResult(run.returnValue, session.id);

      console.info("[diagnostics] report webhook completed workflow", {
        result,
        sessionId: session.id,
        sessionType: session.type,
      });

      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json(
      { error: `Unsupported session type: ${session.type}` },
      { status: 400 },
    );
  } catch (error) {
    console.error("Report generation endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function getReportWorkflowResult(
  returnValue: Promise<unknown>,
  sessionId: string,
) {
  try {
    return await returnValue;
  } catch (error) {
    if (!WorkflowRunFailedError.is(error)) {
      throw error;
    }

    const report = await prisma.report.findUnique({
      where: { sessionId },
      select: { errorMessage: true, status: true },
    });

    if (report?.status !== "FAILED") {
      throw error;
    }

    const errorMessage =
      report.errorMessage || getWorkflowRunFailedMessage(error);
    console.info("[diagnostics] report webhook acknowledged failed workflow", {
      error: errorMessage,
      runId: error.runId,
      sessionId,
    });

    return {
      error: errorMessage,
      status: "FAILED" as const,
    };
  }
}

function getWorkflowRunFailedMessage(error: WorkflowRunFailedError) {
  return error.cause.message || error.message || "Report generation failed";
}
