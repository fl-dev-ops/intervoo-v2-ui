import { redirect } from "next/navigation";
import { DiagnosticsAgentSession } from "@/components/diagnostics/diagnostics-agent-session";
import { requirePageStage } from "@/lib/stage-guards";

type Props = {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{
    token?: string;
    server_url?: string;
    room_name?: string;
    round_id?: string;
    job_title?: string;
    companies?: string;
    salary?: string;
    coach?: string;
  }>;
};

export default async function SessionPage({ params, searchParams }: Props) {
  const { sessionId } = await params;
  const {
    token,
    server_url: serverUrl,
    room_name: roomName,
    round_id: roundId,
    job_title: jobTitle,
    companies,
    coach,
  } = await searchParams;

  const { user } = await requirePageStage(["DIAGNOSTICS", "COMPLETED"]);

  if (!token || !serverUrl || !roomName || !sessionId) {
    redirect("/jobs");
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
      userName={user.name ?? null}
    />
  );
}
