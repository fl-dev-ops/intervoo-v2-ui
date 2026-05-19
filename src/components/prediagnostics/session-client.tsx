"use client";

import {
  RoomAudioRenderer,
  SessionProvider,
  useSession,
} from "@livekit/components-react";
import { TokenSource } from "livekit-client";
import { useEffect, useMemo } from "react";
import { PrediagnosticsSessionView } from "@/components/prediagnostics/prediagnostics-session-view";
import type { CoachOption } from "@/lib/coaches";

interface SessionPageClientProps {
  token: string;
  serverUrl: string;
  roomName: string;
  sessionId: string;
  coach?: CoachOption | null;
  video?: boolean;
  interactionMode?: "ptt" | "auto";
  completeEndpoint?: string;
  redirectUrl?: string;
}

export function SessionPageClient({
  token,
  serverUrl,
  roomName,
  sessionId,
  coach,
  video = false,
  interactionMode = "ptt",
  completeEndpoint = "/api/sessions/end",
  redirectUrl,
}: SessionPageClientProps) {
  useEffect(() => {
    window.history.replaceState(null, "", "/prediagnostics/session");
  }, []);

  const tokenSource = useMemo(
    () =>
      TokenSource.literal({
        serverUrl,
        participantToken: token,
      }),
    [serverUrl, token],
  );

  const session = useSession(tokenSource);

  return (
    <SessionProvider session={session}>
      <RoomAudioRenderer room={session.room} />
      <PrediagnosticsSessionView
        coach={coach}
        roomName={roomName}
        sessionId={sessionId}
        video={video}
        interactionMode={interactionMode}
        completeEndpoint={completeEndpoint}
        redirectUrl={redirectUrl}
      />
    </SessionProvider>
  );
}
