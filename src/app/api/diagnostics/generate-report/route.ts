import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isDiagnosticReportReady } from "@/lib/diagnostics/rules";
import { getUserStage } from "@/lib/progress";
import { generateSessionReport } from "@/lib/report-generation/session-report";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stage = await getUserStage(session.user.id);
    console.info("[diagnostics] manual report request", {
      stage,
      userId: session.user.id,
    });
    if (stage !== "DIAGNOSTICS" && stage !== "COMPLETED") {
      return NextResponse.json(
        { error: "Diagnostics are not available for this user stage" },
        { status: 409 },
      );
    }

    const body = (await request.json()) as { sessionId?: string };

    if (!body.sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const interviewSession = await prisma.interviewSession.findUnique({
      where: { id: body.sessionId },
      include: { report: true, user: true },
    });

    if (!interviewSession || interviewSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (interviewSession.type !== "DIAGNOSTIC_ROUND") {
      return NextResponse.json(
        { error: "Not a diagnostic round session" },
        { status: 400 },
      );
    }

    if (isDiagnosticReportReady(interviewSession.report?.status)) {
      return NextResponse.json({
        status: "READY",
        shareToken: interviewSession.report.shareToken,
      });
    }

    try {
      const result = await generateSessionReport({
        baseUrl: process.env.WEBHOOK_BASE_URL || request.nextUrl.origin,
        sessionId: interviewSession.id,
      });

      console.info("[diagnostics] manual report result", {
        result,
        sessionId: interviewSession.id,
        userId: session.user.id,
      });

      return NextResponse.json(result);
    } catch (generationError) {
      const message =
        generationError instanceof Error
          ? generationError.message
          : "Report generation failed";

      console.error("Diagnostic report generation failed:", generationError);

      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (error) {
    console.error("Diagnostic generate-report error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate diagnostic report",
      },
      { status: 500 },
    );
  }
}
