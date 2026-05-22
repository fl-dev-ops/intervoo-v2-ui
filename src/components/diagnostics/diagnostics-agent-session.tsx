"use client";

import { loadUserChoices } from "@livekit/components-core";
import {
  RoomAudioRenderer,
  SessionProvider,
  type TrackReference,
  useAgent,
  useLocalParticipant,
  useSession,
  useSessionContext,
  useSessionMessages,
  VideoTrack,
} from "@livekit/components-react";
import {
  ConnectionState,
  ParticipantKind,
  RoomEvent,
  TokenSource,
  Track,
} from "livekit-client";
import { motion, type Variants } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { AgentAudioVisualizerAura } from "@/components/agents-ui/agent-audio-visualizer-aura";
import { EndSessionDialog } from "@/components/diagnostics/end-session-dialog";
import { SessionExitGuard } from "@/components/session/session-exit-guard";
import { getRoundConfig } from "@/lib/diagnostics/rounds-config";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { CustomAgentControlBar } from "./custom-agent-control-bar";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const PAGE_SEQUENCE: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: EASE_OUT_EXPO,
      staggerChildren: 0.1,
      delayChildren: 0.06,
    },
  },
};

const FADE_UP: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.58, ease: EASE_OUT_EXPO },
  },
};

const FADE_SCALE: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.62, ease: EASE_OUT_EXPO },
  },
};

const MAIN_SEQUENCE: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.12,
    },
  },
};

interface DiagnosticsAgentSessionProps {
  token: string;
  serverUrl: string;
  roomName: string;
  sessionId: string;
  roundId?: string;
  jobTitle?: string;
  companies?: string[];
  coach?: string;
}

export function DiagnosticsAgentSession({
  token,
  serverUrl,
  roundId,
  sessionId,
  jobTitle,
  coach,
}: DiagnosticsAgentSessionProps) {
  const tokenSource = useMemo(
    () =>
      TokenSource.literal({
        serverUrl,
        participantToken: token,
      }),
    [serverUrl, token],
  );

  const session = useSession(tokenSource);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return;
    if (session.connectionState !== ConnectionState.Disconnected) return;

    hasStartedRef.current = true;
    const savedChoices = loadUserChoices();
    console.info("[diagnostics] live session starting", {
      cameraEnabled: savedChoices.videoEnabled,
      microphoneEnabled: savedChoices.audioEnabled,
      roundId: roundId ?? null,
      sessionId,
    });
    void session.start({
      tracks: {
        microphone: { enabled: savedChoices.audioEnabled },
        camera: { enabled: savedChoices.videoEnabled },
      },
    });
  }, [roundId, session, sessionId]);

  return (
    <SessionProvider session={session}>
      <RoomAudioRenderer room={session.room} />
      <SessionLayout
        coach={coach}
        jobTitle={jobTitle}
        roundId={roundId}
        sessionId={sessionId}
      />
    </SessionProvider>
  );
}

function SessionLayout({
  roundId,
  sessionId,
  jobTitle,
  coach,
}: {
  roundId?: string;
  sessionId: string;
  jobTitle?: string;
  coach?: string;
}) {
  const router = useRouter();
  const session = useSessionContext();
  const agent = useAgent();
  const { messages } = useSessionMessages(session);
  const {
    cameraTrack: cameraPublication,
    isCameraEnabled,
    localParticipant,
  } = useLocalParticipant();
  const [latestMessage, setLatestMessage] = useState("");
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [endDialogMode, setEndDialogMode] = useState<"confirm" | "need-more">(
    "need-more",
  );
  const hasNavigatedRef = useRef(false);
  const isEndingRef = useRef(false);
  const [guardActive, setGuardActive] = useState(true);

  const cameraTrack = useMemo<TrackReference | undefined>(() => {
    if (!cameraPublication) return undefined;
    return {
      source: Track.Source.Camera,
      participant: localParticipant,
      publication: cameraPublication,
    };
  }, [cameraPublication, localParticipant]);

  useEffect(() => {
    const handleAgentDisconnected = (participant: {
      kind: ParticipantKind;
    }) => {
      if (participant.kind !== ParticipantKind.AGENT) return;
      if (hasNavigatedRef.current) return;

      hasNavigatedRef.current = true;
      flushSync(() => setGuardActive(false));
      console.info("[diagnostics] agent disconnected; navigating to rounds", {
        sessionId,
      });
      router.push("/diagnostics/rounds");
    };

    session.room.on(RoomEvent.ParticipantDisconnected, handleAgentDisconnected);

    return () => {
      session.room.off(
        RoomEvent.ParticipantDisconnected,
        handleAgentDisconnected,
      );
    };
  }, [session.room, sessionId, router]);

  useEffect(() => {
    const agentMessages = messages.filter(
      (msg) =>
        msg.from?.kind === ParticipantKind.AGENT || msg.from?.isLocal === false,
    );
    const last = agentMessages.at(-1);
    if (last?.message) {
      setLatestMessage(last.message);
    }
  }, [messages]);

  const conversationMessageCount = useMemo(
    () =>
      messages.filter(
        (msg) =>
          !!msg.message?.trim() &&
          (msg.from?.isLocal || msg.from?.kind === ParticipantKind.AGENT),
      ).length,
    [messages],
  );

  const promptEndSession = () => {
    setEndDialogMode(conversationMessageCount >= 8 ? "confirm" : "need-more");
    setEndDialogOpen(true);
    console.info("[diagnostics] end session prompted", {
      conversationMessageCount,
      mode: conversationMessageCount >= 8 ? "confirm" : "need-more",
      sessionId,
    });
  };

  const endSession = async () => {
    if (isEndingRef.current) return;
    isEndingRef.current = true;
    setEndDialogOpen(false);

    hasNavigatedRef.current = true;
    flushSync(() => setGuardActive(false));
    console.info("[diagnostics] ending live session", { sessionId });
    await session.room.localParticipant
      ?.setMicrophoneEnabled(false)
      .catch(() => {});
    await session.end();

    await fetch("/api/sessions/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {});

    router.push("/diagnostics/rounds");
  };

  const roundConfig = roundId ? getRoundConfig(roundId) : undefined;
  const agentName = coach
    ? coach.charAt(0).toUpperCase() + coach.slice(1)
    : "Sara";

  return (
    <SessionExitGuard active={guardActive} onExitAttempt={promptEndSession}>
      <motion.div
        className="relative flex min-h-dvh flex-col overflow-hidden bg-[#1B1238]"
        variants={PAGE_SEQUENCE}
        initial="hidden"
        animate="visible"
      >
        {/* Dot pattern background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage: "url('/dot-pattern.svg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />

        {/* Header */}
        <motion.header
          className="flex shrink-0 items-center justify-between px-4 py-3"
          variants={FADE_UP}
        >
          <div />
          <SessionTimer />
        </motion.header>

        {/* Main content */}
        <motion.div
          className="flex min-h-0 flex-1 flex-col"
          variants={MAIN_SEQUENCE}
        >
          {/* Info + Orb section */}
          <div
            className={cn(
              "flex flex-col items-center justify-center transition-all duration-300",
              "flex-1",
            )}
          >
            {/* Role/Company info */}
            {jobTitle && (
              <motion.div
                className="text-center space-y-2 mb-2"
                variants={FADE_UP}
              >
                <h2 className="text-lg font-semibold text-white">{jobTitle}</h2>
                {/* Round info */}
                {roundConfig && (
                  <div className="text-xs font-normal text-gray-400">
                    {roundConfig.eyebrow} · {roundConfig.title}
                  </div>
                )}
              </motion.div>
            )}

            {/* Orb */}
            <motion.div variants={FADE_SCALE}>
              <AgentAudioVisualizerAura
                state={agent.state}
                audioTrack={agent.microphoneTrack}
                color="#a78bfa"
                colorShift={0.6}
                themeMode="dark"
              />
            </motion.div>

            {/* Agent name */}
            <motion.div className="text-center" variants={FADE_UP}>
              <h3 className="text-xl font-semibold text-white">{agentName}</h3>
              <p className="mt-0.5 text-sm text-white/60">Interviewer</p>
            </motion.div>

            <motion.div
              className={cn(
                "mt-2 md:mt-20 min-h-50 px-4 transition-all",
                "shrink-0 pb-4",
              )}
              variants={FADE_UP}
            >
              <div className="h-full flex flex-col justify-end md:justify-start">
                {latestMessage && agent.state !== "connecting" && (
                  <p className="max-w-lg text-center text-sm leading-relaxed text-white/80">
                    {latestMessage}
                  </p>
                )}
              </div>
            </motion.div>
          </div>

          {/* Transcript section */}
        </motion.div>

        {/* Footer */}
        <motion.footer
          className="shrink-0 px-3 pb-3 md:px-6 md:pb-6"
          variants={FADE_UP}
        >
          <CustomAgentControlBar
            controls={{
              microphone: true,
              camera: false,
              leave: true,
            }}
            isConnected={session.isConnected}
            onDisconnect={promptEndSession}
          />
        </motion.footer>

        <EndSessionDialog
          isOpen={endDialogOpen}
          mode={endDialogMode}
          onClose={() => setEndDialogOpen(false)}
          onConfirmEnd={endSession}
          onContinue={() => setEndDialogOpen(false)}
        />

        {/* Floating camera preview */}
        <motion.div
          className={cn(
            "absolute z-50 left-4 top-4 overflow-hidden rounded-2xl border border-white/15 bg-black/50 shadow-xl shadow-black/40 backdrop-blur-md",
            "md:h-50 md:w-50 h-40 w-40",
          )}
          variants={FADE_SCALE}
        >
          {isCameraEnabled && cameraTrack ? (
            <VideoTrack
              trackRef={cameraTrack}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#312260]">
              {/*<CameraOff className="size-6 text-white/50" />*/}
              <Avatar size="lg">
                <AvatarFallback className={"bg-[#4F379A] text-white"}>
                  CN
                </AvatarFallback>
              </Avatar>
            </div>
          )}
        </motion.div>
      </motion.div>
    </SessionExitGuard>
  );
}

function SessionTimer() {
  const [elapsed, setElapsed] = useState("00:00");
  const startRef = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Date.now() - startRef.current;
      const mins = Math.floor(diff / 60000)
        .toString()
        .padStart(2, "0");
      const secs = Math.floor((diff % 60000) / 1000)
        .toString()
        .padStart(2, "0");
      setElapsed(`${mins}:${secs}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="font-sans text-base text-white/70 tracking-widest">
      {elapsed}
    </span>
  );
}
