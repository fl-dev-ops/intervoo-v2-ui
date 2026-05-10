import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DiagnosticsVideoSessionClient } from "@/components/diagnostics/video-session-client";
import { auth } from "@/lib/auth";

export default async function DiagnosticsSessionPage({
  searchParams,
}: {
  searchParams: Promise<{
    token?: string;
    server_url?: string;
    room_name?: string;
    session_id?: string;
  }>;
}) {
  const {
    token,
    server_url: serverUrl,
    room_name: roomName,
    session_id: sessionId,
  } = await searchParams;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!token || !serverUrl || !roomName || !sessionId) {
    redirect("/diagnostics/rounds");
  }

  return (
    <DiagnosticsVideoSessionClient
      token={token}
      serverUrl={serverUrl}
      roomName={roomName}
      sessionId={sessionId}
      completeEndpoint="/api/diagnostics/complete"
      redirectUrl="/diagnostics/rounds"
    />
  );
}
