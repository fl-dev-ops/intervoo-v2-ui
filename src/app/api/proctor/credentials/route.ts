import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getAutoProctorClientId,
  hashAutoProctorTestAttemptId,
  updateSessionProctorMetadata,
} from "@/lib/proctor/server";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { sessionId?: unknown };
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const interviewSession = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      select: { id: true, type: true, userId: true },
    });

    if (!interviewSession || interviewSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (interviewSession.type !== "DIAGNOSTIC_ROUND") {
      return NextResponse.json(
        { error: "Unsupported session type" },
        { status: 400 },
      );
    }

    await updateSessionProctorMetadata(sessionId, {
      status: "credentials-issued",
    });

    return NextResponse.json({
      clientId: getAutoProctorClientId(),
      testAttemptId: interviewSession.id,
      hashedTestAttemptId: hashAutoProctorTestAttemptId(interviewSession.id),
    });
  } catch (error) {
    console.error("Proctor credentials error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create credentials",
      },
      { status: 500 },
    );
  }
}
