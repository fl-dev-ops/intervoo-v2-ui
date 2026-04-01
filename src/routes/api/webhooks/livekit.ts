import { createFileRoute } from "@tanstack/react-router";
import {
  handleLiveKitWebhookEvent,
  parseLiveKitWebhookEvent,
} from "#/diagnostic/pre-screening-webhook";

export async function postHandler({ request }: { request: Request }) {
  try {
    const event = await parseLiveKitWebhookEvent(request);
    console.log("event received from Livekit", event.event);

    return await handleLiveKitWebhookEvent(event);
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
