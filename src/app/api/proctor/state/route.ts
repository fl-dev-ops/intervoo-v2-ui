import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateSessionProctorMetadata } from "@/lib/proctor/server";
import type { ProctorStatus } from "@/lib/proctor/types";

const VALID_STATUSES = new Set<ProctorStatus>([
  "idle",
  "credentials-issued",
  "monitoring",
  "stopped",
  "failed",
]);

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      sessionId?: unknown;
      status?: unknown;
      reportJson?: unknown;
      trustScore?: unknown;
      errorCode?: unknown;
      errorDetail?: unknown;
    };
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const interviewSession = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (!interviewSession || interviewSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const status = typeof body.status === "string" ? body.status : null;
    if (!status || !VALID_STATUSES.has(status as ProctorStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await updateSessionProctorMetadata(sessionId, {
      status: status as ProctorStatus,
      ...(status === "monitoring"
        ? { startedAt: new Date().toISOString() }
        : {}),
      ...(status === "stopped" ? { stoppedAt: new Date().toISOString() } : {}),
      ...(typeof body.errorCode === "number"
        ? { errorCode: body.errorCode }
        : {}),
      ...(typeof body.errorDetail === "string"
        ? { errorDetail: body.errorDetail }
        : {}),
      ...("reportJson" in body ? { reportJson: body.reportJson } : {}),
      ...(typeof body.trustScore === "number"
        ? { trustScore: body.trustScore }
        : {}),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Proctor state error:", error);
    return NextResponse.json(
      { error: "Failed to update proctor state" },
      { status: 500 },
    );
  }
}
