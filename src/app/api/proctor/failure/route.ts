import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateSessionProctorMetadata } from "@/lib/proctor/server";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      errorCode?: unknown;
      errorDetail?: unknown;
      sessionId?: unknown;
    };
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const interviewSession = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: { diagnosticRound: { include: { diagnostic: true } } },
    });

    if (!interviewSession || interviewSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const errorCode =
      typeof body.errorCode === "number" ? body.errorCode : null;
    const errorDetail =
      typeof body.errorDetail === "string"
        ? body.errorDetail
        : "Proctoring could not start";

    await updateSessionProctorMetadata(sessionId, {
      errorCode,
      errorDetail,
      status: "failed",
    });

    await prisma.diagnosticRound.updateMany({
      where: { sessionId, status: "STARTED" },
      data: { status: "COMPLETED" },
    });

    await prisma.report.upsert({
      where: { sessionId },
      create: {
        errorMessage: errorDetail,
        failedAt: new Date(),
        sessionId,
        status: "FAILED",
      },
      update: {
        errorMessage: errorDetail,
        failedAt: new Date(),
        status: "FAILED",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Proctor failure error:", error);
    return NextResponse.json(
      { error: "Failed to record proctor failure" },
      { status: 500 },
    );
  }
}
