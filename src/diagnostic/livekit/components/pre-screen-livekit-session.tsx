import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useLocalParticipant,
  useMediaDeviceSelect,
  useRoomContext,
  useTrackToggle,
  useTranscriptions,
  useVoiceAssistant,
} from "@livekit/components-react";
import { LoaderCircle, Mic, MicOff, PhoneOff, Radio, RotateCcw } from "lucide-react";
import { LocalAudioTrack, Track } from "livekit-client";
import type {
  CompletePreScreenSessionRequestDto,
  StartPreScreenSessionResponseDto,
} from "#/diagnostic/dto";
import { PreScreenChatMessageList } from "./chat-message-list";
import { MicrophonePermissionGate } from "./microphone-permission-gate";
import { WaveformBars } from "./waveform-bars";
import {
  buildPreScreenTranscriptSummary,
  normalizePreScreenTranscriptMessages,
} from "../utils/transcript";

interface PreScreenLiveKitSessionProps {
  connection: StartPreScreenSessionResponseDto["livekit"];
  studentName?: string | null;
  roleFocus?: string | null;
  pending: boolean;
  onFinish: (
    payload?: Pick<
      CompletePreScreenSessionRequestDto,
      "transcript" | "transcriptSummary" | "sessionMetadata"
    >,
  ) => Promise<void>;
  onRestart: () => Promise<void>;
}

export function PreScreenLiveKitSession({
  connection,
  studentName,
  roleFocus,
  pending,
  onFinish,
  onRestart,
}: PreScreenLiveKitSessionProps) {
  const [roomError, setRoomError] = useState<string | null>(null);
  const [wasDisconnected, setWasDisconnected] = useState(false);
  const finishRequestedRef = useRef(false);

  if (wasDisconnected) {
    return (
      <div className="space-y-5">
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          The interview connection ended before you finished. Restart the pre-screen setup to create
          a fresh session and try again.
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
          <button
            type="button"
            onClick={() => void onRestart()}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4" />
            {pending ? "Restarting..." : "Restart pre-screen setup"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {roomError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {roomError}
        </div>
      ) : null}

      <MicrophonePermissionGate>
        <LiveKitRoom
          token={connection.participantToken}
          serverUrl={connection.serverUrl}
          connect
          audio
          onError={(error) => setRoomError(error.message)}
          onDisconnected={() => {
            if (!finishRequestedRef.current) {
              setWasDisconnected(true);
            }
          }}
          className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]"
        >
          <RoomAudioRenderer />
          <PreScreenLiveKitSessionContent
            connection={connection}
            finishRequestedRef={finishRequestedRef}
            pending={pending}
            roleFocus={roleFocus}
            studentName={studentName}
            onFinish={onFinish}
          />
        </LiveKitRoom>
      </MicrophonePermissionGate>
    </div>
  );
}

function PreScreenLiveKitSessionContent({
  connection,
  finishRequestedRef,
  pending,
  roleFocus,
  studentName,
  onFinish,
}: {
  connection: StartPreScreenSessionResponseDto["livekit"];
  finishRequestedRef: MutableRefObject<boolean>;
  pending: boolean;
  roleFocus?: string | null;
  studentName?: string | null;
  onFinish: PreScreenLiveKitSessionProps["onFinish"];
}) {
  const room = useRoomContext();
  const connectionState = useConnectionState(room);
  const { localParticipant } = useLocalParticipant();
  const { agent, state: assistantState } = useVoiceAssistant();
  const transcriptions = useTranscriptions();
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const messages = useMemo(
    () => normalizePreScreenTranscriptMessages(transcriptions, localParticipant?.identity),
    [localParticipant?.identity, transcriptions],
  );

  useEffect(() => {
    if (!localParticipant) {
      return;
    }

    const handleSpeakingChanged = (speaking: boolean) => {
      setIsUserSpeaking(speaking);
    };

    localParticipant.on("isSpeakingChanged", handleSpeakingChanged);

    return () => {
      localParticipant.off("isSpeakingChanged", handleSpeakingChanged);
    };
  }, [localParticipant]);

  async function handleFinish() {
    if (pending) {
      return;
    }

    setFinishError(null);
    finishRequestedRef.current = true;

    try {
      await onFinish({
        transcript: messages,
        transcriptSummary: buildPreScreenTranscriptSummary(messages),
        sessionMetadata: {
          roomName: connection.roomName,
          serverUrl: connection.serverUrl,
          participantIdentity: localParticipant?.identity ?? null,
          interviewerIdentity: agent?.identity ?? null,
          connectionState,
          assistantState,
          messageCount: messages.length,
          endedFromClientAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      finishRequestedRef.current = false;
      setFinishError(error instanceof Error ? error.message : "Failed to finish the pre-screen.");
    }
  }

  return (
    <div className="flex min-h-[620px] flex-col">
      <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              AI
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">AI interviewer</p>
              <p className="text-xs text-slate-500">{getAssistantStateLabel(assistantState)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <StatusPill label="Connection" value={formatConnectionState(connectionState)} />
            <StatusPill label="Recording" value="On" />
            <StatusPill label="Role focus" value={roleFocus ?? "General practice"} />
          </div>
        </div>
      </header>

      {finishError ? (
        <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
          {finishError}
        </div>
      ) : null}

      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <PreScreenChatMessageList
          messages={messages}
          isWaitingForAgent={assistantState === "thinking" || assistantState === "speaking"}
        />

        <aside className="space-y-4 rounded-[28px] border border-slate-200 bg-slate-50/80 p-4">
          <SidebarBlock label="Student" value={studentName ?? "Unknown"} />
          <SidebarBlock label="Interview focus" value={roleFocus ?? "General interview practice"} />
          <SidebarBlock label="Interviewer status" value={getAssistantStateLabel(assistantState)} />
          <SidebarBlock label="Messages so far" value={String(messages.length)} />
        </aside>
      </div>

      <footer className="border-t border-slate-200 bg-white px-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <MicrophoneControl isUserSpeaking={isUserSpeaking} />

          <button
            type="button"
            onClick={() => void handleFinish()}
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <PhoneOff className="h-4 w-4" />
            )}
            {pending ? "Finishing..." : "End pre-screen"}
          </button>
        </div>
      </footer>
    </div>
  );
}

function MicrophoneControl({ isUserSpeaking }: { isUserSpeaking: boolean }) {
  const room = useRoomContext();
  const microphoneToggle = useTrackToggle({ source: Track.Source.Microphone });
  const localTrack =
    microphoneToggle.track?.track instanceof LocalAudioTrack
      ? microphoneToggle.track.track
      : undefined;
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({
    kind: "audioinput",
    room,
    track: localTrack,
    requestPermissions: false,
  });

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={() => void microphoneToggle.toggle()}
        disabled={microphoneToggle.pending}
        className="inline-flex items-center gap-3 rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {microphoneToggle.pending ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : microphoneToggle.enabled ? (
          <Mic className="h-4 w-4 text-emerald-600" />
        ) : (
          <MicOff className="h-4 w-4 text-slate-500" />
        )}
        <span>{microphoneToggle.enabled ? "Microphone on" : "Microphone off"}</span>
        <WaveformBars isSpeaking={microphoneToggle.enabled && isUserSpeaking} />
      </button>

      {devices.length > 1 ? (
        <label className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700">
          <Radio className="h-4 w-4 text-slate-500" />
          <span className="sr-only">Select microphone</span>
          <select
            value={activeDeviceId || devices[0]?.deviceId || ""}
            onChange={(event) => {
              void setActiveMediaDevice(event.target.value);
            }}
            className="bg-transparent outline-none"
          >
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || "Microphone"}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}

function SidebarBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-800">{value}</p>
    </div>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700">
      {label}: {value}
    </span>
  );
}

function formatConnectionState(connectionState: string) {
  return connectionState.charAt(0).toUpperCase() + connectionState.slice(1);
}

function getAssistantStateLabel(state: string) {
  if (state === "listening") return "Listening";
  if (state === "thinking") return "Thinking";
  if (state === "speaking") return "Speaking";
  if (state === "initializing") return "Getting ready";
  if (state === "connecting") return "Connecting";
  return "Waiting to join";
}
