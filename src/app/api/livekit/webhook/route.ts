import { WebhookReceiver } from "livekit-server-sdk";
import { type NextRequest, NextResponse } from "next/server";
import { completeInterviewSessionByRoom } from "@/lib/interview-session";
import { getLiveKitCredentials } from "@/lib/livekit";

export async function POST(request: NextRequest) {
  try {
    const { apiKey, apiSecret } = getLiveKitCredentials();
    const body = await request.text();
    const authorization = request.headers.get("authorization") || "";
    const receiver = new WebhookReceiver(apiKey, apiSecret);
    const event = await receiver.receive(body, authorization);

    if (event.event === "room_finished" && event.room?.name) {
      await completeInterviewSessionByRoom(event.room.name).catch((error) => {
        console.warn("Failed to complete session from LiveKit webhook", error);
      });

      // Report generation will be triggered here in the next phase.
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("LiveKit webhook error:", error);
    return NextResponse.json(
      { error: "Invalid LiveKit webhook" },
      { status: 400 },
    );
  }
}
