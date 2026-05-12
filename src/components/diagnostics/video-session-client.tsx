"use client";

import {
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import {
  Camera,
  CameraOff,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
} from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DiagnosticsVideoSessionClientProps = {
  token: string;
  serverUrl: string;
  roomName: string;
  sessionId: string;
  completeEndpoint: string;
  redirectUrl: string;
};

export function DiagnosticsVideoSessionClient({
  token,
  serverUrl,
  roomName,
  sessionId,
  completeEndpoint,
  redirectUrl,
}: DiagnosticsVideoSessionClientProps) {
  useEffect(() => {
    window.history.replaceState(null, "", "/diagnostics/session");
  }, []);

  return (
    <LiveKitRoom
      audio
      connect
      serverUrl={serverUrl}
      token={token}
      video
      className="min-h-svh bg-zinc-950 text-white"
    >
      <RoomAudioRenderer />
      <DiagnosticsVideoRoom
        completeEndpoint={completeEndpoint}
        redirectUrl={redirectUrl}
        roomName={roomName}
        sessionId={sessionId}
      />
    </LiveKitRoom>
  );
}

function DiagnosticsVideoRoom({
  completeEndpoint,
  redirectUrl,
  roomName,
  sessionId,
}: {
  completeEndpoint: string;
  redirectUrl: string;
  roomName: string;
  sessionId: string;
}) {
  const room = useRoomContext();
  const endingRef = useRef(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
  ]);

  const toggleCamera = useCallback(async () => {
    const nextValue = !cameraEnabled;
    setCameraEnabled(nextValue);
    await room.localParticipant.setCameraEnabled(nextValue).catch(() => {
      setCameraEnabled(!nextValue);
    });
  }, [cameraEnabled, room.localParticipant]);

  const toggleMicrophone = useCallback(async () => {
    const nextValue = !micEnabled;
    setMicEnabled(nextValue);
    await room.localParticipant.setMicrophoneEnabled(nextValue).catch(() => {
      setMicEnabled(!nextValue);
    });
  }, [micEnabled, room.localParticipant]);

  const endSession = useCallback(async () => {
    if (endingRef.current) return;

    endingRef.current = true;
    setIsEnding(true);

    await room.disconnect();
    await fetch(completeEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {});
    window.location.href = redirectUrl;
  }, [completeEndpoint, redirectUrl, room, sessionId]);

  return (
    <div className="flex min-h-svh flex-col bg-[radial-gradient(circle_at_top,#312e81_0%,#09090b_45%,#000_100%)]">
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-violet-200/80">
            Diagnostic video session
          </p>
          <h1 className="mt-1 text-base font-semibold text-white sm:text-lg">
            Live interview room
          </h1>
        </div>
        <div className="hidden max-w-[18rem] truncate rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs text-white/70 sm:block">
          {roomName}
        </div>
      </header>

      <main className="flex flex-1 px-3 pb-3 sm:px-6 sm:pb-6">
        <div className="relative flex min-h-[65vh] flex-1 overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/35 shadow-2xl shadow-black/30">
          {tracks.length ? (
            <GridLayout
              tracks={tracks}
              className="lk-grid-layout h-full w-full p-3"
            >
              <ParticipantTile />
            </GridLayout>
          ) : (
            <div className="grid flex-1 place-items-center text-white/70">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Connecting to interview room...</p>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="sticky bottom-0 flex justify-center px-4 pb-5">
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-zinc-950/80 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <ControlButton
            active={micEnabled}
            activeIcon={<Mic className="h-5 w-5" />}
            inactiveIcon={<MicOff className="h-5 w-5" />}
            label={micEnabled ? "Mute microphone" : "Unmute microphone"}
            onClick={toggleMicrophone}
          />
          <ControlButton
            active={cameraEnabled}
            activeIcon={<Camera className="h-5 w-5" />}
            inactiveIcon={<CameraOff className="h-5 w-5" />}
            label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
            onClick={toggleCamera}
          />
          <Button
            className="h-12 rounded-full px-5"
            disabled={isEnding}
            variant="destructive"
            onClick={() => void endSession()}
          >
            {isEnding ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PhoneOff className="mr-2 h-4 w-4" />
            )}
            End
          </Button>
        </div>
      </footer>
    </div>
  );
}

function ControlButton({
  active,
  activeIcon,
  inactiveIcon,
  label,
  onClick,
}: {
  active: boolean;
  activeIcon: ReactNode;
  inactiveIcon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={cn(
        "grid h-12 w-12 place-items-center rounded-full transition",
        active
          ? "bg-white text-zinc-950 hover:bg-zinc-200"
          : "bg-red-500 text-white hover:bg-red-600",
      )}
      type="button"
      onClick={onClick}
    >
      {active ? activeIcon : inactiveIcon}
    </button>
  );
}
