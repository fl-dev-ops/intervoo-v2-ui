import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "#/db";
import {
  getPreScreenWebhookReceiver,
  shouldAllowUnverifiedLiveKitWebhook,
} from "#/diagnostic/livekit";

type LiveKitWebhookEvent = {
  event?: string;
  room?: { name?: string | null } | null;
  participant?: { identity?: string | null; name?: string | null } | null;
  egressInfo?: {
    egressId?: string | null;
    roomName?: string | null;
    fileResults?: Array<{ location?: string | null }>;
  } | null;
};

function getEventRoomName(event: LiveKitWebhookEvent) {
  return event.egressInfo?.roomName ?? event.room?.name ?? null;
}

function getAudioUrlFromEvent(event: LiveKitWebhookEvent) {
  return event.egressInfo?.fileResults?.[0]?.location ?? null;
}

function isAgentParticipant(event: LiveKitWebhookEvent) {
  const identity = event.participant?.identity?.toLowerCase() ?? "";
  const name = event.participant?.name?.toLowerCase() ?? "";
  return identity.includes("agent") || name.includes("agent");
}

async function parseWebhookEvent(request: Request): Promise<LiveKitWebhookEvent> {
  const body = await request.text();
  const authHeader = request.headers.get("Authorization");

  if (authHeader) {
    const receiver = getPreScreenWebhookReceiver();
    return (await receiver.receive(body, authHeader)) as LiveKitWebhookEvent;
  }

  if (shouldAllowUnverifiedLiveKitWebhook()) {
    return JSON.parse(body) as LiveKitWebhookEvent;
  }

  throw new Response("Missing webhook authorization header", { status: 401 });
}

async function markSessionCompleted(roomName: string) {
  const session = await prisma.preScreenSession.findUnique({
    where: { roomName },
    include: { draft: true },
  });

  if (!session) {
    return;
  }

  const endedAt = session.endedAt ?? new Date();

  await prisma.preScreenSession.update({
    where: { id: session.id },
    data: {
      status: "COMPLETED",
      endedAt,
    },
  });

  await prisma.preScreenQuestionnaireDraft.update({
    where: { id: session.draftId },
    data: {
      status: "COMPLETED",
      completedAt: session.draft.completedAt ?? endedAt,
    },
  });
}

async function handleWebhookEvent(event: LiveKitWebhookEvent) {
  const roomName = getEventRoomName(event);

  if (!roomName) {
    return new Response(JSON.stringify({ success: true, ignored: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (event.event === "egress_ended") {
    const audioUrl = getAudioUrlFromEvent(event);
    const egressId = event.egressInfo?.egressId ?? null;
    const session = await prisma.preScreenSession.findUnique({
      where: { roomName },
    });

    if (session) {
      await prisma.preScreenSession.update({
        where: { id: session.id },
        data: {
          egressId,
          audioUrl,
          sessionMetadata: {
            ...(typeof session.sessionMetadata === "object" &&
            session.sessionMetadata !== null &&
            !Array.isArray(session.sessionMetadata)
              ? session.sessionMetadata
              : {}),
            egress: event.egressInfo ?? null,
          },
        },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (event.event === "room_finished") {
    await markSessionCompleted(roomName);
  }

  if (event.event === "participant_left" && isAgentParticipant(event)) {
    await markSessionCompleted(roomName);
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function postHandler({ request }: { request: Request }) {
  try {
    const event = await parseWebhookEvent(request);
    return await handleWebhookEvent(event);
  } catch (error) {
    console.error("[livekit webhook] processing failed", error);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: error instanceof Response ? error.status : 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const Route = createFileRoute("/api/webhooks/livekit")({
  server: {
    handlers: {
      POST: postHandler,
    },
  },
});
