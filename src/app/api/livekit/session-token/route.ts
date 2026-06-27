import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createParticipantToken, getLiveKitCredentials } from "@/lib/livekit";

export async function POST(request: NextRequest) {
  try {
    const authSession = await auth.api.getSession({ headers: await headers() });
    if (!authSession?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { sessionId?: unknown };
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const interviewSession = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: { user: { include: { resume: true } } },
    });

    if (!interviewSession || interviewSession.userId !== authSession.user.id) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (interviewSession.type !== "DIAGNOSTIC_ROUND") {
      return NextResponse.json(
        { error: "Unsupported session type" },
        { status: 400 },
      );
    }

    const { liveKitUrl } = getLiveKitCredentials();
    const participantName =
      interviewSession.user.resume?.name ||
      interviewSession.user.name ||
      "Learner";
    const participantToken = await createParticipantToken({
      identity: `diag_${interviewSession.userId}`,
      name: participantName,
      roomName: interviewSession.roomName,
    });

    return NextResponse.json({
      participant_token: participantToken,
      room_name: interviewSession.roomName,
      server_url: liveKitUrl,
    });
  } catch (error) {
    console.error("LiveKit session token error:", error);
    return NextResponse.json(
      { error: "Failed to create session token" },
      { status: 500 },
    );
  }
}
