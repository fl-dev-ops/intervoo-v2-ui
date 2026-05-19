import { redirect } from "next/navigation";
import { SessionPageClient } from "@/components/prediagnostics/session-client";
import type { CoachOption } from "@/lib/coaches";
import { prisma } from "@/lib/db";
import { requirePageStage } from "@/lib/stage-guards";

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

  const { user } = await requirePageStage(["PREDIAGNOSTICS"]);

  if (!token || !url || !room || !session) {
    redirect("/prediagnostics");
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { coach: true },
  });

  return (
    <SessionPageClient
      coach={toCoachOption(profile?.coach)}
      interactionMode={interactionMode}
      roomName={room}
      serverUrl={url}
      sessionId={session}
      token={token}
      video={video}
      redirectUrl="/prediagnostics/report"
    />
  );
}

function toCoachOption(value: string | null | undefined): CoachOption | null {
  return value === "sana" || value === "arjun" ? value : null;
}
