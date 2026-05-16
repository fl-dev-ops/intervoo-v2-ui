import { SessionPageClient } from "@/components/prediagnostics/session-client";
import { requirePageStage } from "@/lib/stage-guards";
import { redirect } from "next/navigation";

export default async function PrediagnosticsSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const url = typeof params.url === "string" ? params.url : "";
  const room = typeof params.room === "string" ? params.room : "";
  const session = typeof params.session === "string" ? params.session : "";
  const video = params.video === "true";
  const rawMode = typeof params.mode === "string" ? params.mode : "ptt";
  const interactionMode = rawMode === "auto" ? "auto" : "ptt";

  await requirePageStage(["PREDIAGNOSTICS"]);

  if (!token || !url || !room || !session) {
    redirect("/prediagnostics");
  }

  return (
    <SessionPageClient
      interactionMode={interactionMode}
      roomName={room}
      serverUrl={url}
      sessionId={session}
      token={token}
      video={video}
    />
  );
}
