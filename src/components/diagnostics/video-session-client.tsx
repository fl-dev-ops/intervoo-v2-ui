"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRoomContext,
} from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
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
import { AgentOrbVisualizer } from "@/components/diagnostics/agent-orb-visualizer";
import {
  EndSessionDialog,
  useEndSessionDialog,
} from "@/components/diagnostics/end-session-dialog";
import { UserPipTile } from "@/components/diagnostics/user-pip-tile";
import { LiveWaveform } from "@/components/ui/live-waveform";
import { cn } from "@/lib/utils";

type DiagnosticsVideoSessionClientProps = {
  token: string;
  serverUrl: string;
  roomName: string;
  sessionId: string;
  completeEndpoint: string;
  redirectUrl: string;
  roundId?: string;
  coachName?: string;
};

export function DiagnosticsVideoSessionClient({
  token,
  serverUrl,
  roomName,
  sessionId,
  completeEndpoint,
  redirectUrl,
  roundId,
  coachName,
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
      className="min-h-dvh bg-zinc-950 text-white"
    >
      <RoomAudioRenderer />
      <DiagnosticsVideoRoom
        coachName={coachName}
        completeEndpoint={completeEndpoint}
        redirectUrl={redirectUrl}
        roomName={roomName}
        roundId={roundId}
        sessionId={sessionId}
      />
    </LiveKitRoom>
  );
}

function DiagnosticsVideoRoom({
  coachName,
  completeEndpoint,
  redirectUrl,
  roomName: _roomName,
  roundId,
  sessionId,
}: {
  coachName?: string;
  completeEndpoint: string;
  redirectUrl: string;
  roomName: string;
  roundId?: string;
  sessionId: string;
}) {
  const room = useRoomContext();
  const endingRef = useRef(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  const lastSpeakerRef = useRef<string | null>(null);
  const turnCountRef = useRef(0);
  const userTurnCountRef = useRef(0);

  const {
    isOpen: dialogOpen,
    dialogMode,
    promptEnd,
    close: closeDialog,
  } = useEndSessionDialog();

  // Round display name
  const roundDisplayName = getRoundDisplayName(roundId);

  // Listen for agent disconnect and room disconnect
  useEffect(() => {
    const handleDisconnected = () => {
      if (endingRef.current) return;
      endingRef.current = true;
      setIsEnding(true);
      window.location.href = redirectUrl;
    };

    const handleParticipantDisconnected = (participant: { kind: number }) => {
      if (participant.kind === 4 && !endingRef.current) {
        // 4 = ParticipantKind.AGENT
        endingRef.current = true;
        setIsEnding(true);
        window.location.href = redirectUrl;
      }
    };

    room.on(RoomEvent.Disconnected, handleDisconnected);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

    return () => {
      room.off(RoomEvent.Disconnected, handleDisconnected);
      room.off(
        RoomEvent.ParticipantDisconnected,
        handleParticipantDisconnected,
      );
    };
  }, [room, redirectUrl]);

  // Track transcription events to count exchanges
  useEffect(() => {
    const handleTranscription = (
      _segments: unknown,
      participant?: { identity: string } | null,
    ) => {
      if (!participant) return;
      const speakerId = participant.identity;
      if (speakerId !== lastSpeakerRef.current) {
        lastSpeakerRef.current = speakerId;
        turnCountRef.current += 1;
        if (speakerId === room.localParticipant?.identity) {
          userTurnCountRef.current += 1;
        }
      }
    };

    room.on(RoomEvent.TranscriptionReceived, handleTranscription);
    return () => {
      room.off(RoomEvent.TranscriptionReceived, handleTranscription);
    };
  }, [room]);

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

  const doEndSession = useCallback(async () => {
    if (endingRef.current) return;

    endingRef.current = true;
    setIsEnding(true);

    await room.disconnect();
    await fetch(completeEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        userTurnCount: userTurnCountRef.current,
      }),
    }).catch(() => {});
    window.location.href = redirectUrl;
  }, [completeEndpoint, redirectUrl, room, sessionId]);

  const handlePromptEnd = useCallback(() => {
    promptEnd(turnCountRef.current);
  }, [promptEnd]);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[radial-gradient(circle_at_top,#312e81_0%,#09090b_45%,#000_100%)]">
      {/* Agent Orb — full page background */}
      <div className="absolute inset-0">
        <AgentOrbVisualizer coachName={coachName} />
      </div>

      {/* User PiP — floating top-right */}
      <div className="absolute right-4 top-4 z-20">
        <UserPipTile isCameraOff={!cameraEnabled} isMuted={!micEnabled} />
      </div>

      {/* Round info badge */}
      {roundDisplayName && (
        <div className="absolute left-4 top-4 z-20">
          <div className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs font-medium text-white/80 backdrop-blur-md">
            {roundDisplayName}
          </div>
        </div>
      )}

      {/* Bottom control bar */}
      <div className="absolute inset-x-0 bottom-0 z-20">
        <div className="mx-auto max-w-2xl px-4 pb-6 pt-8">
          {/* Waveform */}
          <div className="mb-4 h-12 overflow-hidden rounded-xl border border-white/10 bg-black/30 backdrop-blur-md">
            <LiveWaveform
              active={micEnabled}
              barColor="#a78bfa"
              barGap={2}
              barRadius={2}
              barWidth={3}
              fadeEdges
              height="100%"
              mode="scrolling"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <ControlButton
              active={micEnabled}
              activeIcon={<Mic className="size-5" />}
              inactiveIcon={<MicOff className="size-5" />}
              label={micEnabled ? "Mute microphone" : "Unmute microphone"}
              onClick={toggleMicrophone}
            />
            <ControlButton
              active={cameraEnabled}
              activeIcon={<Camera className="size-5" />}
              inactiveIcon={<CameraOff className="size-5" />}
              label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
              onClick={toggleCamera}
            />
            <button
              className="inline-flex h-12 items-center gap-2 rounded-full bg-red-500 px-6 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
              disabled={isEnding}
              type="button"
              onClick={handlePromptEnd}
            >
              {isEnding ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <PhoneOff className="size-4" />
              )}
              End
            </button>
          </div>
        </div>
      </div>

      {/* End Session Dialog */}
      <EndSessionDialog
        isOpen={dialogOpen}
        mode={dialogMode}
        onClose={closeDialog}
        onConfirmEnd={doEndSession}
        onContinue={closeDialog}
      />
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
        "grid size-12 place-items-center rounded-full transition",
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

function getRoundDisplayName(roundId?: string): string | null {
  if (!roundId) return null;
  const names: Record<string, string> = {
    behavioural: "Round 2 of 4",
    "career-readiness": "Round 4 of 4",
    screening: "Round 1 of 4",
    "technical-thinking": "Round 3 of 4",
  };
  return names[roundId] ?? null;
}
