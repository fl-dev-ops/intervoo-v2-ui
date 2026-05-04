import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, MicOff, PhoneOff, RotateCcw, VideoOff } from "lucide-react";
import { AgentAudioVisualizerAura } from "#/components/agents-ui/agent-audio-visualizer-aura";
import { AgentAudioVisualizerBar } from "#/components/agents-ui/agent-audio-visualizer-bar";
import { AgentSessionProvider } from "#/components/agents-ui/agent-session-provider";
import { StartAudioButton } from "#/components/agents-ui/start-audio-button";
import { Button } from "#/components/ui/button";
import {
  ConnectionState as LiveKitConnectionState,
  RoomAudioRenderer,
  TokenSource,
  Track,
  useAgent,
  useConnectionState,
  useRoomContext,
  useSession,
  useSessionContext,
  type UseSessionReturn,
} from "#/shared/livekit";
import { useDiagnosticsMessages } from "#/features/diagnostics/hooks/use-diagnostics-messages";
import { useDiagnosticsTranscript } from "#/features/diagnostics/hooks/use-diagnostics-transcript";
import type { DiagnosticsConnectionDetails } from "#/lib/livekit/diagnostics";

type DiagnosticsSessionPageProps = {
  connectionDetails: DiagnosticsConnectionDetails;
  onFinished: (payload: { sessionId: string }) => void;
};

export function DiagnosticsSessionPage(props: DiagnosticsSessionPageProps) {
  const tokenSource = useMemo(
    () =>
      TokenSource.literal({
        serverUrl: props.connectionDetails.serverUrl,
        participantToken: props.connectionDetails.participantToken,
      }),
    [props.connectionDetails.participantToken, props.connectionDetails.serverUrl],
  );
  const session = useSession(tokenSource);

  return (
    <AgentSessionProvider session={session}>
      <DiagnosticsSessionContent {...props} session={session} />
    </AgentSessionProvider>
  );
}

function DiagnosticsSessionContent(
  props: DiagnosticsSessionPageProps & { session: UseSessionReturn },
) {
  const selectedOption = props.connectionDetails.selectedJob;
  const videoRef = useRef<HTMLVideoElement>(null);
  const { start, end } = useSessionContext();
  const room = useRoomContext();
  const connectionState = useConnectionState(props.session.room);
  const isConnected = connectionState === LiveKitConnectionState.Connected;
  const isReconnecting = connectionState === LiveKitConnectionState.Reconnecting;
  const agent = useAgent(props.session);
  const messages = useDiagnosticsMessages(props.session);
  const { getTranscript } = useDiagnosticsTranscript(messages);
  const [hasStartBeenRequested, setHasStartBeenRequested] = useState(false);
  const [sessionHasStarted, setSessionHasStarted] = useState(false);
  const [hasCompletedSession, setHasCompletedSession] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const hasAgentBeenActiveRef = useRef(false);
  const isEndingRef = useRef(false);
  const latestUserMessage = messages.toReversed().find((message) => message.role === "user");
  const agentLabel =
    agent.state === "speaking"
      ? "Sara Speaking"
      : agent.state === "thinking"
        ? "Sara Thinking"
        : agent.state === "initializing"
          ? "Initializing..."
          : agent.state === "connecting"
            ? "Connecting..."
            : "Sara Listening";

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (hasStartBeenRequested || isConnected) {
      return;
    }

    setHasStartBeenRequested(true);
    void start({
      tracks: {
        microphone: {
          enabled: true,
        },
        camera: {
          enabled: true,
        },
      },
    });
  }, [hasStartBeenRequested, isConnected, start]);

  useEffect(() => {
    if (sessionHasStarted || !isConnected) {
      return;
    }

    setSessionHasStarted(true);
  }, [isConnected, sessionHasStarted]);

  useEffect(() => {
    const publication = room.localParticipant.getTrackPublication(Track.Source.Camera);
    const track = publication?.track;

    if (!videoRef.current || !track || typeof track.attach !== "function") {
      return;
    }

    const videoElement = videoRef.current;
    track.attach(videoElement);

    return () => {
      track.detach(videoElement);
    };
  }, [cameraEnabled, room.localParticipant]);

  if (agent.canListen || agent.state === "speaking") {
    hasAgentBeenActiveRef.current = true;
  }

  const finalizeAndEndSession = useCallback(async () => {
    if (isEndingRef.current || hasCompletedSession) {
      return;
    }

    isEndingRef.current = true;
    setIsEnding(true);
    setEndError(null);

    try {
      const response = await fetch("/api/diagnostics/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: props.connectionDetails.sessionId,
          transcript: getTranscript(),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload && typeof payload === "object" && "error" in payload && payload.error
            ? String(payload.error)
            : "Failed to finalize diagnostic session",
        );
      }

      await end();
      setHasCompletedSession(true);
      props.onFinished({ sessionId: props.connectionDetails.sessionId });
    } catch (error) {
      setEndError(error instanceof Error ? error.message : "Failed to finalize diagnostic session");
    } finally {
      isEndingRef.current = false;
      setIsEnding(false);
    }
  }, [end, getTranscript, hasCompletedSession, props]);

  useEffect(() => {
    if (
      sessionHasStarted &&
      hasAgentBeenActiveRef.current &&
      agent.isFinished &&
      !hasCompletedSession
    ) {
      void finalizeAndEndSession();
    }
  }, [agent.isFinished, finalizeAndEndSession, hasCompletedSession, sessionHasStarted]);

  const toggleCamera = useCallback(async () => {
    const nextEnabled = !cameraEnabled;
    setCameraEnabled(nextEnabled);
    await room.localParticipant.setCameraEnabled(nextEnabled);
  }, [cameraEnabled, room.localParticipant]);

  if (isReconnecting) {
    return (
      <main className="h-screen max-h-screen overflow-hidden bg-[#150d38] text-white">
        <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,#211052_0%,#160c3a_44%,#11072c_100%)]">
          <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(circle,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:14px_14px]" />
          <div className="relative z-10 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-purple-200 opacity-75" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
                <RotateCcw className="h-8 w-8 animate-spin text-purple-600" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-white">Reconnecting...</h2>
              <p className="max-w-[200px] text-sm text-white/60">
                Your connection was interrupted. We&apos;re restoring your session.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen max-h-screen overflow-hidden bg-[#150d38] text-white">
      <div className="relative flex h-full flex-col overflow-hidden bg-[radial-gradient(circle_at_center,#211052_0%,#160c3a_44%,#11072c_100%)]">
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(circle,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:14px_14px]" />

        <header className="relative z-10 flex items-center justify-between px-6 py-5">
          <div className="flex min-w-0 items-center gap-4">
            <h1 className="line-clamp-1 text-base font-semibold tracking-[-0.01em] text-white">
              Diagnostic Interview - {selectedOption.title}
            </h1>
          </div>

          <Button
            variant={"destructive"}
            aria-label="End interview"
            className="h-13 w-28 rounded-full bg-[#f26f6f]! text-white shadow-none hover:bg-[#ea6262]!"
            size="icon"
            type="button"
            disabled={isEnding}
            onClick={finalizeAndEndSession}
          >
            {isEnding ? (
              <LoaderCircle className="h-6 w-6 animate-spin" />
            ) : (
              <PhoneOff className="h-6 w-6" />
            )}
          </Button>
        </header>

        <button
          aria-label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
          className="group absolute top-28 right-8 z-20 w-64 overflow-hidden rounded-[1.25rem] bg-black shadow-[0_18px_45px_rgba(0,0,0,0.28)] lg:right-10"
          type="button"
          onClick={() => void toggleCamera()}
        >
          <div className="relative aspect-[1.34]">
            {cameraEnabled ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full scale-x-[-1] object-cover"
              />
            ) : (
              <div className="grid h-full place-items-center bg-black text-white/75">
                <p className="text-sm">Camera is off</p>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/65 to-transparent px-5 py-4">
              <span className="text-base font-medium">You</span>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/12 text-white backdrop-blur-md transition group-hover:bg-white/20">
                <VideoOff className="h-5 w-5" />
              </span>
            </div>
          </div>
        </button>

        <section className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-22 text-center">
          <div className="flex flex-col items-center">
            <AgentAudioVisualizerAura
              size="md"
              state={agent.state}
              themeMode="dark"
              color="#72E58A"
              colorShift={0.24}
              className="h-32"
            />
            <h2 className="mt-5 text-xl font-semibold tracking-[-0.02em]">Sara</h2>
            <p className="mt-1 text-sm text-white/42">Interview partner</p>
          </div>

          <p className="mt-14 max-w-130 text-center text-base leading-7 text-white/88">
            {latestUserMessage?.text ??
              (isConnected
                ? "Sara will begin your diagnostic interview shortly."
                : "Connecting...")}
          </p>
          {endError ? <p className="mt-4 text-sm text-red-200">{endError}</p> : null}
        </section>

        <p className="absolute bottom-10 left-8 z-10 text-base font-medium tracking-[-0.01em] text-white/62">
          {formatDuration(elapsedSeconds)}
        </p>

        <div className="absolute inset-x-0 bottom-10 z-10 flex justify-center">
          <div className="flex min-w-48 items-center justify-center gap-5 rounded-full border border-white/8 bg-white/12 px-6 py-3 text-white/82 shadow-[0_14px_42px_rgba(0,0,0,0.24)] backdrop-blur-xl">
            <span className="text-sm font-medium">{agentLabel}</span>
            <AgentAudioVisualizerBar
              size="icon"
              state={agent.state}
              barCount={5}
              color="#b9b0d6"
              className="h-5"
            />
          </div>
        </div>

        <div className="absolute right-8 bottom-10 z-10 hidden text-white/40 lg:block">
          <MicOff className="h-4 w-4" />
        </div>

        <div className="absolute right-4 bottom-4 z-10">
          <StartAudioButton label="Enable audio" size="sm" variant="secondary" />
        </div>

        <RoomAudioRenderer />
      </div>
    </main>
  );
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
