import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useLocalParticipant,
  useMediaDeviceSelect,
  useTracks,
  useTranscriptions,
} from "@livekit/components-react";
import { DisconnectReason, Track } from "livekit-client";
import { Camera, CameraOff, LoaderCircle, Mic, PhoneOff, SendHorizontal } from "lucide-react";
import { cn } from "#/lib/utils";
import type { LiveKitConnectionDetails, LiveKitTranscriptMessage } from "#/common/livekit/types";
import { getPushToTalkButtonLabel, getControlBarLabel, usePushToTalk } from "../push-to-talk";
import { normalizeLiveKitTranscriptMessages } from "../utils/transcript";
import { MicrophonePermissionGate } from "./microphone-permission-gate";

interface InterviewLiveKitSessionProps {
  connection: LiveKitConnectionDetails;
  pending: boolean;
  studentName?: string | null;
  sessionSubtitleFallback?: string;
  experience?: "default" | "diagnostic";
  onExit: () => void;
  onFinalizeSession?: (input: {
    sessionId: string;
    messages: LiveKitTranscriptMessage[];
  }) => Promise<boolean>;
  onRetry: () => Promise<void>;
}

function isIntentionalServerEnd(reason?: DisconnectReason): boolean {
  const extendedReasons = DisconnectReason as unknown as Record<
    string,
    DisconnectReason | undefined
  >;

  return (
    reason === DisconnectReason.PARTICIPANT_REMOVED ||
    reason === DisconnectReason.ROOM_DELETED ||
    reason === extendedReasons.ROOM_CLOSED ||
    reason === extendedReasons.SERVER_SHUTDOWN
  );
}

export function InterviewLiveKitSession({
  connection,
  pending,
  studentName,
  sessionSubtitleFallback,
  experience = "default",
  onExit,
  onFinalizeSession,
  onRetry,
}: InterviewLiveKitSessionProps) {
  const [roomError, setRoomError] = useState<string | null>(null);
  const [wasDisconnected, setWasDisconnected] = useState(false);
  const [isFinalizingSession, setIsFinalizingSession] = useState(false);
  const hasFinalizeStartedRef = useRef(false);
  const latestMessagesRef = useRef<LiveKitTranscriptMessage[]>([]);

  async function handleFinalizeSession() {
    if (hasFinalizeStartedRef.current) {
      return;
    }

    hasFinalizeStartedRef.current = true;
    setRoomError(null);
    setIsFinalizingSession(true);

    try {
      if (!onFinalizeSession) {
        onExit();
        return;
      }

      const succeeded = await onFinalizeSession({
        sessionId: connection.sessionId,
        messages: latestMessagesRef.current,
      });

      if (!succeeded) {
        hasFinalizeStartedRef.current = false;
      }
    } finally {
      setIsFinalizingSession(false);
    }
  }

  if (wasDisconnected) {
    return (
      <div className="grid min-h-[55dvh] place-items-center">
        <div className="w-full rounded-3xl border border-slate-700/90 bg-slate-950/85 p-6 shadow-[0_28px_60px_rgba(2,6,23,0.55)]">
          <h3 className="text-lg font-semibold text-slate-50">The interview session ended</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Your session disconnected before the interview finished.
          </p>
          <div className="mt-5 grid gap-3">
            <button
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
              type="button"
              onClick={onExit}
            >
              Back to preview
            </button>
            <button
              className="inline-flex h-12 w-full items-center justify-center rounded-full border border-amber-300/50 bg-amber-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={pending}
              type="button"
              onClick={() => void onRetry()}
            >
              {pending ? "Reconnecting..." : "Reconnect"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {roomError ? (
        <div className="mb-3 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {roomError}
        </div>
      ) : null}

      <MicrophonePermissionGate>
        <LiveKitRoom
          token={connection.participantToken}
          serverUrl={connection.serverUrl}
          connect
          audio={false}
          video={experience === "diagnostic"}
          onError={(error) => setRoomError(error.message)}
          onDisconnected={(reason) => {
            if (hasFinalizeStartedRef.current) {
              return;
            }

            if (isIntentionalServerEnd(reason)) {
              void handleFinalizeSession();
              return;
            }

            setWasDisconnected(true);
          }}
          className="flex min-h-0 flex-1"
        >
          <RoomAudioRenderer />
          <InterviewLiveKitSessionContent
            pending={pending || isFinalizingSession}
            studentName={studentName}
            sessionSubtitleFallback={sessionSubtitleFallback}
            experience={experience}
            onTranscriptMessagesChange={(messages) => {
              latestMessagesRef.current = messages;
            }}
            onEndSession={async () => {
              await handleFinalizeSession();
            }}
          />
        </LiveKitRoom>
      </MicrophonePermissionGate>
    </div>
  );
}

function InterviewLiveKitSessionContent({
  pending,
  studentName,
  sessionSubtitleFallback,
  experience = "default",
  onTranscriptMessagesChange,
  onEndSession,
}: {
  pending: boolean;
  studentName?: string | null;
  sessionSubtitleFallback?: string;
  experience?: "default" | "diagnostic";
  onTranscriptMessagesChange: (messages: LiveKitTranscriptMessage[]) => void;
  onEndSession: () => Promise<void>;
}) {
  const { localParticipant, isCameraEnabled } = useLocalParticipant();
  const transcriptions = useTranscriptions();
  const [clientError, setClientError] = useState<string | null>(null);
  const [isTogglingCamera, setIsTogglingCamera] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const cameraTrackRefs = useTracks([Track.Source.Camera]);

  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({
    kind: "audioinput",
    requestPermissions: false,
  });

  const { pttState, canRecord, isAgentReady, error, toggleRecording } = usePushToTalk({
    onError: setClientError,
  });

  const messages = normalizeLiveKitTranscriptMessages(transcriptions, localParticipant?.identity);
  const localCameraTrackRef = useMemo(
    () =>
      cameraTrackRefs.find(
        (trackRef) => trackRef.participant.identity === localParticipant?.identity,
      ) ?? null,
    [cameraTrackRefs, localParticipant?.identity],
  );
  const controlBarLabel = getControlBarLabel(pttState, isAgentReady);
  const buttonLabel = getPushToTalkButtonLabel(pttState, isAgentReady);
  const activeTurnStartedAtRef = useRef<number | null>(null);
  const [isAwaitingAgentResponse, setIsAwaitingAgentResponse] = useState(false);
  const pendingAgentBaselineIdRef = useRef<string | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollAnimationFrameRef = useRef<number | null>(null);
  const latestUserMessageSignatureRef = useRef<string | null>(null);

  const scrollTranscriptToBottom = useCallback(() => {
    if (scrollAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollAnimationFrameRef.current);
    }

    scrollAnimationFrameRef.current = window.requestAnimationFrame(() => {
      const transcriptContainer = transcriptContainerRef.current;

      if (!transcriptContainer) {
        return;
      }

      transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (scrollAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollAnimationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (pttState === "recording" && activeTurnStartedAtRef.current === null) {
      activeTurnStartedAtRef.current = Date.now();
      return;
    }

    if (pttState !== "recording") {
      activeTurnStartedAtRef.current = null;
    }
  }, [pttState]);

  const inProgressUserTranscript = useMemo(() => {
    if (pttState !== "recording") {
      return null;
    }

    const localIdentity = localParticipant?.identity;
    const activeTurnStartedAt = activeTurnStartedAtRef.current;

    if (!localIdentity || activeTurnStartedAt === null) {
      return null;
    }

    const relevantSegments = transcriptions.filter((segment) => {
      if (segment.participantInfo?.identity !== localIdentity) {
        return false;
      }

      if (!segment.text.trim()) {
        return false;
      }

      return segment.streamInfo.timestamp >= activeTurnStartedAt;
    });

    if (!relevantSegments.length) {
      return null;
    }

    return relevantSegments
      .map((segment) => segment.text.trim())
      .join(" ")
      .trim();
  }, [localParticipant?.identity, pttState, transcriptions]);

  const visibleMessages = useMemo(() => {
    const activeTurnStartedAt = activeTurnStartedAtRef.current;

    const filteredMessages =
      pttState === "recording" && activeTurnStartedAt !== null
        ? messages.filter((message) => {
            if (message.role !== "user") {
              return true;
            }

            return new Date(message.timestamp).getTime() < activeTurnStartedAt;
          })
        : messages;

    return collapseAdjacentMessages(filteredMessages);
  }, [messages, pttState]);

  const micStateLabel = getMicStateLabel(pttState);
  const lastVisibleMessage = visibleMessages[visibleMessages.length - 1];
  const lastAgentMessage =
    [...visibleMessages].reverse().find((message) => message.role === "agent") ?? null;
  const latestUserMessage =
    [...visibleMessages].reverse().find((message) => message.role === "user") ?? null;
  const latestUserMessageSignature = latestUserMessage
    ? `${latestUserMessage.id}:${latestUserMessage.timestamp}:${latestUserMessage.text}`
    : null;

  useEffect(() => {
    if (pttState === "processing" || pttState === "agent_speaking") {
      if (!isAwaitingAgentResponse) {
        pendingAgentBaselineIdRef.current = lastAgentMessage?.id ?? null;
        setIsAwaitingAgentResponse(true);
      }
      return;
    }

    if (pttState === "recording") {
      setIsAwaitingAgentResponse(false);
      pendingAgentBaselineIdRef.current = null;
    }
  }, [isAwaitingAgentResponse, lastAgentMessage?.id, pttState]);

  useEffect(() => {
    if (!isAwaitingAgentResponse) {
      return;
    }

    if (lastAgentMessage && lastAgentMessage.id !== pendingAgentBaselineIdRef.current) {
      setIsAwaitingAgentResponse(false);
      pendingAgentBaselineIdRef.current = null;
    }
  }, [isAwaitingAgentResponse, lastAgentMessage]);

  const showAgentLoader =
    visibleMessages.length > 0 && isAwaitingAgentResponse && lastVisibleMessage?.role !== "agent";

  useEffect(() => {
    onTranscriptMessagesChange(messages);
  }, [messages, onTranscriptMessagesChange]);

  useEffect(() => {
    if (pttState !== "agent_speaking") {
      return;
    }

    scrollTranscriptToBottom();
  }, [pttState, scrollTranscriptToBottom, showAgentLoader, visibleMessages]);

  useEffect(() => {
    if (!latestUserMessageSignature) {
      return;
    }

    if (latestUserMessageSignatureRef.current === latestUserMessageSignature) {
      return;
    }

    latestUserMessageSignatureRef.current = latestUserMessageSignature;
    scrollTranscriptToBottom();
  }, [latestUserMessageSignature, scrollTranscriptToBottom]);

  useEffect(() => {
    if (experience !== "diagnostic" || !localParticipant) {
      return;
    }

    void localParticipant.setCameraEnabled(true).catch((nextError) => {
      const message = nextError instanceof Error ? nextError.message : "Could not enable camera.";
      setClientError(message);
    });
  }, [experience, localParticipant]);

  useEffect(() => {
    if (experience !== "diagnostic") {
      return;
    }

    const startedAt = Date.now();
    setElapsedSeconds(0);

    const intervalId = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [experience]);

  async function handleToggleCamera() {
    if (!localParticipant || isTogglingCamera) {
      return;
    }

    setIsTogglingCamera(true);

    try {
      setClientError(null);
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Could not toggle camera.";
      setClientError(message);
    } finally {
      setIsTogglingCamera(false);
    }
  }

  if (experience === "diagnostic") {
    const statusLabel =
      pttState === "agent_speaking"
        ? "● 🧑‍🦱 SANA IS SPEAKING"
        : pttState === "recording"
          ? "● 🎤 YOU ARE SPEAKING"
          : "● 💬 INTERVIEW LIVE";

    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[34px] border border-slate-700/80 bg-slate-950/95 shadow-[0_28px_60px_rgba(2,6,23,0.55)]">
        <section className="relative h-[260px] shrink-0 overflow-hidden border-b border-slate-700/70 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.14),rgba(2,6,23,0.96))]">
          {isCameraEnabled && localCameraTrackRef ? (
            <VideoTrack
              trackRef={localCameraTrackRef}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-slate-300">
              <div className="text-center">
                <div className="mx-auto flex size-24 items-center justify-center rounded-full border border-amber-300/30 bg-amber-400/10 text-5xl">
                  👤
                </div>
                <div className="mt-3 text-sm">Camera is off</div>
              </div>
            </div>
          )}

          <div className="absolute left-3 top-3 rounded-lg bg-black/65 px-3 py-1 text-[13px] font-semibold tracking-[0.1em] text-amber-300">
            {formatElapsedTime(elapsedSeconds)}
          </div>

          <button
            className="absolute right-3 top-3 inline-flex h-10 items-center gap-2 rounded-full border border-rose-400/40 bg-rose-500/50 px-4 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/70 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending}
            type="button"
            onClick={() => void onEndSession()}
          >
            <PhoneOff className="h-4 w-4" />
            End call
          </button>

          <div className="absolute left-3 top-12 rounded-2xl border border-amber-300/40 bg-slate-950/90 px-3 py-2 text-center">
            <div className="text-xl">🤖</div>
            <div className="mt-1 text-xs font-semibold tracking-[0.08em] text-amber-300">
              SANA AI
            </div>
          </div>

          <button
            className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full border border-slate-500/80 bg-black/65 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isTogglingCamera}
            type="button"
            onClick={() => void handleToggleCamera()}
          >
            {isCameraEnabled ? (
              <CameraOff className="h-3.5 w-3.5" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
            <span>
              {isTogglingCamera
                ? "Updating..."
                : isCameraEnabled
                  ? "Turn Camera Off"
                  : "Turn Camera On"}
            </span>
          </button>
        </section>

        <section ref={transcriptContainerRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="mb-3 text-[13px] font-black tracking-[0.08em] text-amber-300">
            {statusLabel}
          </div>

          {visibleMessages.length === 0 ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-4 text-sm leading-6 text-slate-300">
              Sana is getting ready...
            </div>
          ) : (
            <div className="space-y-3">
              {visibleMessages.map((message) => (
                <article
                  key={message.id}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm leading-7",
                    message.role === "agent"
                      ? "border-amber-300/35 bg-slate-900 text-slate-100"
                      : "border-sky-300/30 bg-sky-500/10 text-sky-100",
                  )}
                >
                  <div
                    className={cn(
                      "mb-2 text-[11px] font-black uppercase tracking-[0.1em]",
                      message.role === "agent" ? "text-amber-300" : "text-sky-300",
                    )}
                  >
                    {message.role === "agent" ? "Sana" : "You"}
                  </div>
                  <p>{message.text}</p>
                </article>
              ))}

              {showAgentLoader ? (
                <div className="inline-flex items-center gap-2 text-sm text-slate-400">
                  <span className="size-1.5 animate-pulse rounded-full bg-amber-300 [animation-delay:0ms]" />
                  <span className="size-1.5 animate-pulse rounded-full bg-amber-300 [animation-delay:120ms]" />
                  <span className="size-1.5 animate-pulse rounded-full bg-amber-300 [animation-delay:240ms]" />
                  <span>Sana is thinking...</span>
                </div>
              ) : null}
            </div>
          )}
        </section>

        <footer className="shrink-0 border-t border-slate-700/80 bg-slate-950 px-4 py-3">
          <div className="mb-2 text-xs text-slate-400">{controlBarLabel}</div>

          {inProgressUserTranscript ? (
            <div className="mb-3 rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
              {inProgressUserTranscript}
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300">
              <span
                className={cn(
                  "size-2 rounded-full bg-slate-500",
                  pttState === "recording"
                    ? "bg-red-400 shadow-[0_0_0_6px_rgba(248,113,113,0.2)]"
                    : "",
                )}
              />
              <span>{micStateLabel}</span>
            </div>

            <button
              className={cn(
                "inline-flex size-14 items-center justify-center rounded-full border border-amber-300/40 bg-amber-400 text-slate-950 shadow-[0_14px_26px_rgba(245,158,11,0.26)] transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60",
                pttState === "recording" ? "ring-8 ring-amber-300/20" : "",
              )}
              disabled={!canRecord || pending}
              type="button"
              onClick={() => void toggleRecording()}
            >
              {pending ? (
                <LoaderCircle className="h-7 w-7 animate-spin" />
              ) : pttState === "recording" ? (
                <SendHorizontal className="h-7 w-7" />
              ) : (
                <Mic className="h-7 w-7" />
              )}
              <span className="sr-only">{buttonLabel}</span>
            </button>
          </div>

          {clientError || error ? (
            <div className="mt-3 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {clientError || error}
            </div>
          ) : null}
        </footer>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-700/90 bg-slate-950/90 shadow-[0_28px_60px_rgba(2,6,23,0.55)]">
      <header className="flex items-center justify-between gap-3 border-b border-slate-700/80 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full border border-amber-300/30 bg-amber-400/10 text-lg">
            🤖
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-100">Sana · AI Guide</div>
            <div className="text-xs text-slate-400">
              {studentName?.trim() || sessionSubtitleFallback || "Interview session"}
            </div>
          </div>
        </div>

        <button
          className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          type="button"
          onClick={() => void onEndSession()}
        >
          <PhoneOff className="h-4 w-4" />
          End
        </button>
      </header>

      <div ref={transcriptContainerRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {visibleMessages.length === 0 ? (
          <div className="grid h-full min-h-[180px] place-items-center">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              Preparing the conversation
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleMessages.map((message) => (
              <article
                key={message.id}
                className={cn(
                  "flex items-start gap-2",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                {message.role === "agent" ? (
                  <div className="flex size-8 items-center justify-center rounded-full bg-slate-800 text-sm">
                    🤖
                  </div>
                ) : null}
                <div
                  className={cn(
                    "max-w-[82%] rounded-2xl border px-3 py-2 text-sm leading-6",
                    message.role === "agent"
                      ? "border-slate-700 bg-slate-900 text-slate-100"
                      : "border-amber-300/30 bg-amber-400/10 text-amber-100",
                  )}
                >
                  <p>{message.text}</p>
                </div>
                {message.role === "user" ? (
                  <div className="flex size-8 items-center justify-center rounded-full bg-slate-800 text-sm">
                    👤
                  </div>
                ) : null}
              </article>
            ))}

            {showAgentLoader ? (
              <article className="flex items-start gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-slate-800 text-sm">
                  🤖
                </div>
                <div className="max-w-[82%] gap-1 flex rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                  <div className="mb-1 flex items-center gap-1" aria-hidden="true">
                    <span className="size-1.5 animate-pulse rounded-full bg-slate-300 [animation-delay:0ms]" />
                    <span className="size-1.5 animate-pulse rounded-full bg-slate-300 [animation-delay:120ms]" />
                    <span className="size-1.5 animate-pulse rounded-full bg-slate-300 [animation-delay:240ms]" />
                  </div>
                  <p>Thinking...</p>
                </div>
              </article>
            ) : null}
          </div>
        )}
      </div>

      <footer className="shrink-0 border-t border-slate-700/80 bg-slate-950 px-4 py-3">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          {controlBarLabel}
        </div>

        {inProgressUserTranscript ? (
          <div className="mt-2 rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
            {inProgressUserTranscript}
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300">
            <span
              className={cn(
                "size-2 rounded-full bg-slate-500",
                pttState === "recording"
                  ? "bg-red-400 shadow-[0_0_0_6px_rgba(248,113,113,0.2)]"
                  : "",
              )}
            />
            <span>{micStateLabel}</span>
          </div>

          <button
            className={cn(
              "inline-flex size-14 items-center justify-center rounded-full border border-amber-300/40 bg-amber-400 text-slate-950 shadow-[0_14px_26px_rgba(245,158,11,0.26)] transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60",
              pttState === "recording" ? "ring-8 ring-amber-300/20" : "",
            )}
            disabled={!canRecord || pending}
            type="button"
            onClick={() => void toggleRecording()}
          >
            {pending ? (
              <LoaderCircle className="h-7 w-7 animate-spin" />
            ) : pttState === "recording" ? (
              <SendHorizontal className="h-7 w-7" />
            ) : (
              <Mic className="h-7 w-7" />
            )}
            <span className="sr-only">{buttonLabel}</span>
          </button>
        </div>

        {devices.length > 1 ? (
          <label className="mt-3 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300">
            <span>Mic</span>
            <select
              className="w-full bg-transparent text-xs text-slate-100 outline-none"
              value={activeDeviceId || devices[0]?.deviceId || ""}
              onChange={(event) => {
                void setActiveMediaDevice(event.target.value);
              }}
            >
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || "Microphone"}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {clientError || error ? (
          <div className="mt-3 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {clientError || error}
          </div>
        ) : null}
      </footer>
    </div>
  );
}

function formatElapsedTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getMicStateLabel(state: string) {
  if (state === "recording") {
    return "Listening";
  }

  if (state === "processing" || state === "agent_speaking") {
    return "Speaking";
  }

  return "Listening";
}

function collapseAdjacentMessages(messages: ReturnType<typeof normalizeLiveKitTranscriptMessages>) {
  return messages.reduce<typeof messages>((result, message) => {
    const previous = result[result.length - 1];

    if (!previous || previous.role !== message.role) {
      result.push({ ...message });
      return result;
    }

    previous.text = `${previous.text} ${message.text}`.trim();
    previous.timestamp = message.timestamp;
    return result;
  }, []);
}
