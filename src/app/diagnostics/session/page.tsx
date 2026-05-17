import { redirect } from "next/navigation";
import { DiagnosticsAgentSession } from "@/components/diagnostics/diagnostics-agent-session";
import { requirePageStage } from "@/lib/stage-guards";

export default async function DiagnosticsSessionPage({
  searchParams,
}: {
  searchParams: Promise<{
    token?: string;
    server_url?: string;
    room_name?: string;
    session_id?: string;
    round_id?: string;
    job_title?: string;
    companies?: string;
    salary?: string;
    coach?: string;
  }>;
}) {
  const {
    token,
    server_url: serverUrl,
    room_name: roomName,
    session_id: sessionId,
    round_id: roundId,
    job_title: jobTitle,
    companies,
    coach,
  } = await searchParams;

  await requirePageStage(["DIAGNOSTICS"]);

  if (!token || !serverUrl || !roomName || !sessionId) {
    console.info("[diagnostics] redirect", {
      from: "/diagnostics/session",
      hasRoomName: Boolean(roomName),
      hasServerUrl: Boolean(serverUrl),
      hasSessionId: Boolean(sessionId),
      hasToken: Boolean(token),
      reason: "missing_connection_params",
      to: "/diagnostics/rounds",
    });
    redirect("/diagnostics/rounds");
  }

  console.info("[diagnostics] render session", {
    coach: coach ?? null,
    companies: companies?.split(",") ?? [],
    jobTitle: jobTitle ?? null,
    roomName,
    roundId: roundId ?? null,
    sessionId,
  });

  return (
    <DiagnosticsAgentSession
      coach={coach}
      companies={companies?.split(",") ?? []}
      jobTitle={jobTitle}
      roomName={roomName}
      roundId={roundId}
      sessionId={sessionId}
      serverUrl={serverUrl}
      token={token}
    />
  );
}
