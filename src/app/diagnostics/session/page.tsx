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
    redirect("/diagnostics/rounds");
  }

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
