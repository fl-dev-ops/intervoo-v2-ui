import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { completeInterviewSessionById } from "@/lib/interview-session";
import { getUserStage } from "@/lib/progress";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { sessionId?: string };

    if (!body.sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const interviewSession = await prisma.interviewSession.findUnique({
      where: { id: body.sessionId },
      select: { type: true, userId: true },
    });

    if (!interviewSession || interviewSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const stage = await getUserStage(session.user.id);
    if (
      interviewSession.type === "PREDIAGNOSTIC" &&
      stage !== "PREDIAGNOSTICS"
    ) {
      return NextResponse.json(
        { error: "Pre-diagnostics are not available for this user stage" },
        { status: 409 },
      );
    }
    if (
      interviewSession.type === "DIAGNOSTIC_ROUND" &&
      stage !== "DIAGNOSTICS" &&
      stage !== "COMPLETED"
    ) {
      return NextResponse.json(
        { error: "Diagnostics are not available for this user stage" },
        { status: 409 },
      );
    }

    await completeInterviewSessionById(body.sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("End session error:", error);
    return NextResponse.json(
      { error: "Failed to end session" },
      { status: 500 },
    );
  }
}
