import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createAgentDispatchClient,
  createParticipantToken,
  getLiveKitCredentials,
} from "@/lib/livekit";

const LIVEKIT_AGENT_NAME = "intervoo-agent-hs";

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

    const { agentName: configuredAgentName, liveKitUrl } =
      getLiveKitCredentials();
    const agentName = configuredAgentName || LIVEKIT_AGENT_NAME;
    const agentDispatchClient = createAgentDispatchClient();
    const dispatches = await agentDispatchClient.listDispatch(
      interviewSession.roomName,
    );
    const existingDispatch = dispatches.find(
      (dispatch) => dispatch.agentName === agentName,
    );

    if (existingDispatch) {
      console.info("[diagnostics] LiveKit agent dispatch reused", {
        agentName,
        roomName: interviewSession.roomName,
        sessionId: interviewSession.id,
      });
    } else {
      await agentDispatchClient.createDispatch(
        interviewSession.roomName,
        agentName,
        {
          metadata: JSON.stringify(interviewSession.metadata ?? {}),
        },
      );
      console.info("[diagnostics] LiveKit agent dispatch created", {
        agentName,
        roomName: interviewSession.roomName,
        sessionId: interviewSession.id,
      });
    }

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
