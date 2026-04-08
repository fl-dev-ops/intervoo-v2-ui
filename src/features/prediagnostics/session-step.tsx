import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  RoomAudioRenderer,
  SessionProvider,
  StartAudio,
  useAgent,
  useChat,
  useLocalParticipant,
  usePersistentUserChoices,
  useSession,
  useSessionContext,
  type UseSessionReturn,
} from "@livekit/components-react";
import { TokenSource } from "livekit-client";
import { LoaderCircle, Mic, SendHorizontal } from "lucide-react";
import { IconKeyboard, IconMicrophone, IconPhoneOff, IconSend2 } from "@tabler/icons-react";

import { EllipsisIcon } from "#/components/ui/ellipsis-icon";
import { LiveWaveform } from "#/components/ui/live-waveform";
import type {
  PrediagnosticsConnectionDetails,
  PrediagnosticsInteractionMode,
} from "#/lib/livekit/prediagnostics";
import {
  type PrediagnosticsMessage,
  usePrediagnosticsMessages,
} from "#/features/prediagnostics/hooks/use-prediagnostics-messages";
import { usePrediagnosticsPushToTalk } from "#/features/prediagnostics/hooks/use-push-to-talk";
import { usePrediagnosticsTranscript } from "#/features/prediagnostics/hooks/use-prediagnostics-transcript";
import type { PrediagnosticsSessionTranscript } from "#/lib/prediagnostics/transcript";

const coachHeaderMeta = {
  sana: {
    title: "Sana",
    imageSrc: "/sara.png",
  },
  arjun: {
    title: "Arjun",
    imageSrc: "/arjun.png",
  },
} as const;

type PrediagnosticsSessionStepProps = {
  connectionDetails: PrediagnosticsConnectionDetails;
  sessionId: string;
  onFinished: (payload: { sessionId: string }) => void;
};

export function PrediagnosticsSessionStep(props: PrediagnosticsSessionStepProps) {
  const tokenSource = useMemo(() => {
    return TokenSource.literal({
      serverUrl: props.connectionDetails.serverUrl,
      participantToken: props.connectionDetails.participantToken,
    });
  }, [props.connectionDetails]);

  return <PrediagnosticsLiveKitSession {...props} tokenSource={tokenSource} />;
}

function PrediagnosticsLiveKitSession(
  props: PrediagnosticsSessionStepProps & {
    tokenSource: ReturnType<typeof TokenSource.literal>;
  },
) {
  const session = useSession(props.tokenSource);

  return (
    <SessionProvider session={session}>
      <PrediagnosticsLiveKitSessionContent {...props} session={session} />
      <StartAudio label="Enable audio" />
      <RoomAudioRenderer />
    </SessionProvider>
  );
}

function PrediagnosticsLiveKitSessionContent(
  props: PrediagnosticsSessionStepProps & {
    session: UseSessionReturn;
  },
) {
  const { isConnected, start, end } = useSessionContext();
  const agent = useAgent(props.session);
  const messages = usePrediagnosticsMessages(props.session);
  const { getTranscript } = usePrediagnosticsTranscript(messages);
  const ptt = usePrediagnosticsPushToTalk();
  const { userChoices } = usePersistentUserChoices({ preventSave: true });
  const [started, setStarted] = useState(false);
  const [hasSeenActiveSession, setHasSeenActiveSession] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);
  const [committedUserVoiceMessages, setCommittedUserVoiceMessages] = useState<
    PrediagnosticsMessage[]
  >([]);
  const hasAgentGreeted = messages.some((m: PrediagnosticsMessage) => m.role === "agent");
  const previousPttStateRef = useRef(ptt.state);
  const activeTurnStartIndexRef = useRef<number | null>(null);

  const userVoiceTranscriptMessages = useMemo(
    () => messages.filter((message) => message.role === "user" && message.kind === "transcript"),
    [messages],
  );
  const activeTurnMessage = useMemo(() => {
    if (
      props.connectionDetails.interactionMode !== "ptt" ||
      activeTurnStartIndexRef.current === null ||
      !ptt.isProcessing
    ) {
      return null;
    }

    const turnMessages = userVoiceTranscriptMessages.slice(activeTurnStartIndexRef.current);
    const combinedText = turnMessages
      .map((message) => message.text.trim())
      .filter(Boolean)
      .join(" ")
      .trim();

    if (!combinedText) {
      return null;
    }

    return {
      id: `active-user-voice-turn-${turnMessages[turnMessages.length - 1]?.timestamp ?? Date.now()}`,
      role: "user" as const,
      kind: "transcript" as const,
      text: combinedText,
      timestamp: turnMessages[turnMessages.length - 1]?.timestamp ?? Date.now(),
    };
  }, [props.connectionDetails.interactionMode, ptt.isProcessing, userVoiceTranscriptMessages]);

  const displayMessages = useMemo(() => {
    if (props.connectionDetails.interactionMode !== "ptt") {
      return messages;
    }

    const visibleMessages = messages.filter(
      (message) => !(message.role === "user" && message.kind === "transcript"),
    );

    return [
      ...visibleMessages,
      ...committedUserVoiceMessages,
      ...(activeTurnMessage ? [activeTurnMessage] : []),
    ].toSorted((left, right) => left.timestamp - right.timestamp);
  }, [
    activeTurnMessage,
    committedUserVoiceMessages,
    messages,
    props.connectionDetails.interactionMode,
  ]);
  const showUserPendingBubble =
    props.connectionDetails.interactionMode === "ptt" && ptt.isRecording;
  const showAgentPendingBubble =
    props.connectionDetails.interactionMode === "ptt" && agent.state === "thinking";

  useEffect(() => {
    if (!started && !isConnected) {
      setStarted(true);
      start({
        tracks: {
          microphone: {
            enabled: props.connectionDetails.interactionMode === "auto",
          },
        },
      }).catch(console.error);
    }
  }, [isConnected, props.connectionDetails.interactionMode, start, started]);

  useEffect(() => {
    if (props.connectionDetails.interactionMode !== "ptt") {
      previousPttStateRef.current = ptt.state;
      activeTurnStartIndexRef.current = null;
      return;
    }

    const previousState = previousPttStateRef.current;

    if (ptt.state === "recording" && previousState !== "recording") {
      activeTurnStartIndexRef.current = userVoiceTranscriptMessages.length;
    }

    const shouldCommitTurn =
      activeTurnStartIndexRef.current !== null &&
      previousState === "processing" &&
      ptt.state !== "processing";

    if (shouldCommitTurn) {
      const turnMessages = userVoiceTranscriptMessages.slice(activeTurnStartIndexRef.current);
      const combinedText = turnMessages
        .map((message) => message.text.trim())
        .filter(Boolean)
        .join(" ")
        .trim();

      if (combinedText) {
        const lastTurnTimestamp = turnMessages[turnMessages.length - 1]?.timestamp ?? Date.now();

        setCommittedUserVoiceMessages((current) => [
          ...current,
          {
            id: `user-voice-turn-${lastTurnTimestamp}-${current.length}`,
            role: "user",
            kind: "transcript",
            text: combinedText,
            timestamp: lastTurnTimestamp,
          },
        ]);
      }

      activeTurnStartIndexRef.current = null;
    }

    previousPttStateRef.current = ptt.state;
  }, [props.connectionDetails.interactionMode, ptt.state, userVoiceTranscriptMessages]);

  const handleSessionEnd = useCallback(
    async (preCapturedTranscript?: PrediagnosticsSessionTranscript) => {
      if (isEnding) {
        return;
      }

      setIsEnding(true);
      setEndError(null);
      try {
        const transcript = preCapturedTranscript ?? getTranscript();

        const response = await fetch("/api/prediagnostics/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId: props.sessionId,
            transcript,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const message =
            payload &&
            typeof payload === "object" &&
            "error" in payload &&
            typeof payload.error === "string"
              ? payload.error
              : "Failed to finalize pre-diagnostic session";
          throw new Error(message);
        }

        await end();
        props.onFinished({ sessionId: props.sessionId });
      } catch (error) {
        setEndError(
          error instanceof Error ? error.message : "Failed to finalize pre-diagnostic session",
        );
      } finally {
        setIsEnding(false);
      }
    },
    [end, getTranscript, isEnding, props],
  );

  useEffect(() => {
    if (
      agent.state === "pre-connect-buffering" ||
      agent.state === "initializing" ||
      agent.state === "idle" ||
      agent.state === "listening" ||
      agent.state === "thinking" ||
      agent.state === "speaking"
    ) {
      setHasSeenActiveSession(true);
    }
  }, [agent.state]);

  useEffect(() => {
    if (hasSeenActiveSession && agent.isFinished) {
      const transcript = getTranscript();
      void handleSessionEnd(transcript);
    }
  }, [agent.isFinished, getTranscript, handleSessionEnd, hasSeenActiveSession]);

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const preferredAudioDeviceId = userChoices.audioDeviceId;

    if (!preferredAudioDeviceId || preferredAudioDeviceId === "default") {
      return;
    }

    if (props.session.room.getActiveDevice("audioinput") === preferredAudioDeviceId) {
      return;
    }

    props.session.room.switchActiveDevice("audioinput", preferredAudioDeviceId, true).catch(() => {
      void props.session.room
        .switchActiveDevice("audioinput", preferredAudioDeviceId, false)
        .catch(() => {});
    });
  }, [isConnected, props.session.room, userChoices.audioDeviceId]);

  const handleEndClick = useCallback(() => {
    const transcript = getTranscript();
    void handleSessionEnd(transcript);
  }, [getTranscript, handleSessionEnd]);

  return (
    <div className="min-h-screen bg-[#F5F3F7]">
      <div className="min-h-screen md:flex md:items-center md:justify-center md:px-6">
        <div className="relative h-screen w-full md:h-[85vh] md:w-100">
          <div
            className="absolute -inset-2 hidden rounded-4xl blur-xl opacity-60 md:block"
            style={{
              background:
                "linear-gradient(168.19deg, #7A2CAF -0.95%, #41D69A 26.72%, #DFCF58 60.2%, #5350B4 91.75%)",
            }}
          />
          <div className="relative z-10 h-full w-full overflow-hidden bg-white md:rounded-[26px] md:shadow-[0_28px_60px_rgba(74,57,143,0.12)]">
            <div className="flex h-full flex-col">
              <SessionHeader
                agentState={agent.state}
                coach={props.connectionDetails.coach}
                isEnding={isEnding}
                onEnd={handleEndClick}
              />
              <ChatTranscript
                messages={displayMessages}
                showAgentPendingBubble={showAgentPendingBubble}
                showUserPendingBubble={showUserPendingBubble}
              />
              {endError ? (
                <div className="border-t border-[#f1d1d5] bg-[#fff7f8] px-5 py-3 text-sm text-[#a03d4d]">
                  {endError}
                </div>
              ) : null}
              <SessionFooter
                interactionMode={props.connectionDetails.interactionMode}
                agentState={agent.state}
                hasAgentGreeted={hasAgentGreeted}
                isEnding={isEnding}
                ptt={ptt}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionHeader(props: {
  agentState: string | undefined;
  coach: PrediagnosticsConnectionDetails["coach"];
  isEnding: boolean;
  onEnd: () => void;
}) {
  const coachMeta = coachHeaderMeta[props.coach];

  return (
    <header className="flex items-center justify-between border-b border-[#e5e0ed] bg-white px-5 py-4">
      <div className="flex items-center gap-3">
        <img
          alt={coachMeta.title}
          className="h-11 w-11 rounded-full object-cover ring-2 ring-[#eee8f5]"
          src={coachMeta.imageSrc}
        />
        <div>
          <h1 className="text-lg font-semibold text-[#2b2233]">Pre-Diagnostic Session</h1>
          <p className="text-sm text-[#7f768f]">{getAgentStateLabel(props.agentState)}</p>
        </div>
      </div>

      <button
        className="flex items-center gap-2 rounded-full border border-[#e5e0ed] px-4 py-2 text-sm font-medium text-[#7f768f] transition hover:bg-[#f5f3f7] disabled:cursor-not-allowed disabled:opacity-50"
        type="button"
        disabled={props.isEnding}
        onClick={props.onEnd}
      >
        {props.isEnding ? (
          <LoaderCircle className="h-6 w-6 animate-spin" />
        ) : (
          <IconPhoneOff className="h-6 w-6 text-red-500" />
        )}
        {props.isEnding ? "Ending..." : null}
      </button>
    </header>
  );
}

function getAgentStateLabel(state: string | undefined): string {
  switch (state) {
    case "listening":
      return "Listening...";
    case "thinking":
      return "Thinking...";
    case "speaking":
      return "Speaking...";
    case "idle":
      return "Ready";
    default:
      return "Connecting...";
  }
}

const ChatMessageBubble = memo(function ChatMessageBubble(props: {
  isUser: boolean;
  text: string;
}) {
  return (
    <div className={`flex ${props.isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          props.isUser ? "bg-[#5a42cc] text-white" : "bg-white text-[#2b2233] shadow-sm"
        }`}
      >
        <p className="text-sm leading-relaxed">{props.text}</p>
      </div>
    </div>
  );
});

const ChatTranscript = memo(function ChatTranscript(props: {
  messages: PrediagnosticsMessage[];
  showAgentPendingBubble: boolean;
  showUserPendingBubble: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [props.messages, props.showAgentPendingBubble, props.showUserPendingBubble]);

  if (!props.messages.length && !props.showAgentPendingBubble && !props.showUserPendingBubble) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-[#7f768f]">Waiting for agent to join...</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
      <div className="space-y-3">
        {props.messages.map((message, index) => {
          const isUser = message.role === "user";
          const messageKey = `${message.id}-${index}`;

          return <ChatMessageBubble key={messageKey} isUser={isUser} text={message.text} />;
        })}
        {props.showUserPendingBubble ? <PendingBubble isUser /> : null}
        {props.showAgentPendingBubble ? <PendingBubble isUser={false} /> : null}
      </div>
    </div>
  );
});

const PendingBubble = memo(function PendingBubble(props: { isUser: boolean }) {
  return (
    <div className="py-2">
      <div className={`flex ${props.isUser ? "justify-end" : "justify-start"}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            props.isUser ? "bg-[#b8addf] text-white" : "bg-white text-[#2b2233] shadow-sm"
          }`}
        >
          <EllipsisIcon className="h-auto w-full" isAnimated animate size={20} />
        </div>
      </div>
    </div>
  );
});

function SessionFooter(props: {
  interactionMode: PrediagnosticsInteractionMode;
  agentState: string | undefined;
  hasAgentGreeted: boolean;
  isEnding: boolean;
  ptt: ReturnType<typeof usePrediagnosticsPushToTalk>;
}) {
  if (props.interactionMode === "auto") {
    return <AutoSessionFooter {...props} />;
  }

  return <PttSessionFooter {...props} />;
}

function AutoSessionFooter(props: {
  agentState: string | undefined;
  hasAgentGreeted: boolean;
  isEnding: boolean;
}) {
  const { send } = useChat();
  const { localParticipant } = useLocalParticipant();
  const [chatMessage, setChatMessage] = useState("");
  const [mode, setMode] = useState<"voice" | "text">("voice");
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(true);

  const isInputDisabled =
    props.isEnding || props.agentState === "thinking" || !props.hasAgentGreeted;

  const handleSendMessage = useCallback(() => {
    if (isInputDisabled) {
      return;
    }

    const nextMessage = chatMessage.trim();

    if (!nextMessage) {
      return;
    }

    void send(nextMessage);
    setChatMessage("");
  }, [chatMessage, isInputDisabled, send]);

  const toggleMicrophone = useCallback(() => {
    if (!localParticipant || isInputDisabled) {
      return;
    }

    const nextEnabled = !isMicrophoneEnabled;
    void localParticipant.setMicrophoneEnabled(nextEnabled);
    setIsMicrophoneEnabled(nextEnabled);
  }, [isInputDisabled, isMicrophoneEnabled, localParticipant]);

  return (
    <div className="mx-auto flex w-full max-w-3xl items-center gap-3 border border-[#e4deee] bg-white p-3 shadow-[0_-6px_32px_rgba(74,57,143,0.08)]">
      <button
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F0ECF6] text-[#6D6780] transition hover:bg-[#ebe4f6] disabled:cursor-not-allowed disabled:opacity-50"
        type="button"
        disabled={isInputDisabled}
        onClick={() => {
          setMode((current) => (current === "voice" ? "text" : "voice"));
        }}
      >
        {mode === "voice" ? (
          <IconKeyboard className="h-6 w-6" />
        ) : (
          <IconMicrophone className="h-6 w-6" />
        )}
      </button>

      {mode === "text" ? (
        <>
          <input
            className="h-12 flex-1 rounded-full border border-[#dcd4e7] bg-white px-5 text-sm text-[#2b2233] placeholder-[#9b92ad] outline-none focus:border-[#5a42cc] disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Type your response..."
            type="text"
            value={chatMessage}
            disabled={isInputDisabled}
            onChange={(event) => setChatMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <button
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(90deg,#4F33A3_0%,#6A4DF5_100%)] text-white shadow-[0_8px_20px_rgba(93,72,220,0.35)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isInputDisabled || !chatMessage.trim()}
            type="button"
            onClick={handleSendMessage}
          >
            <SendHorizontal className="h-4 w-4" />
          </button>
        </>
      ) : (
        <button
          className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium text-white shadow-[0_8px_20px_rgba(93,72,220,0.35)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 ${
            isMicrophoneEnabled
              ? "bg-[linear-gradient(90deg,#4F33A3_0%,#6A4DF5_100%)]"
              : "bg-[#b4abc5]"
          }`}
          type="button"
          disabled={isInputDisabled}
          onClick={toggleMicrophone}
        >
          <Mic className="h-4 w-4" />
          {isMicrophoneEnabled ? "Microphone on" : "Microphone off"}
        </button>
      )}
    </div>
  );
}

function PttSessionFooter(props: {
  agentState: string | undefined;
  hasAgentGreeted: boolean;
  isEnding: boolean;
  ptt: ReturnType<typeof usePrediagnosticsPushToTalk>;
}) {
  const { send } = useChat();
  const [chatMessage, setChatMessage] = useState("");
  const [mode, setMode] = useState<"voice" | "text">("voice");

  const isInputDisabled =
    props.isEnding || props.agentState === "thinking" || !props.hasAgentGreeted;

  const handleSendMessage = useCallback(() => {
    if (isInputDisabled) {
      return;
    }

    const nextMessage = chatMessage.trim();

    if (!nextMessage) {
      return;
    }

    void send(nextMessage);
    setChatMessage("");
  }, [chatMessage, isInputDisabled, send]);

  const showUserWaveform = props.ptt.isRecording;
  const isVoiceDisabled =
    !props.ptt.isAvailable ||
    props.ptt.isProcessing ||
    props.ptt.isAgentSpeaking ||
    isInputDisabled;

  const handleVoiceToggle = useCallback(() => {
    if (isVoiceDisabled) {
      return;
    }

    if (props.ptt.isRecording) {
      void props.ptt.endTurn();
      return;
    }

    void props.ptt.startTurn();
  }, [isVoiceDisabled, props.ptt]);

  useEffect(() => {
    if (showUserWaveform) {
      setMode("voice");
    }
  }, [showUserWaveform]);

  return (
    <div className="mx-auto flex w-full max-w-3xl items-center gap-3 border border-[#e4deee] bg-white p-3 shadow-[0_-6px_32px_rgba(74,57,143,0.08)]">
      <button
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F0ECF6] text-[#6D6780] transition hover:bg-[#ebe4f6] disabled:cursor-not-allowed disabled:opacity-50"
        type="button"
        disabled={isInputDisabled}
        onClick={() => {
          setMode((current) => (current === "voice" ? "text" : "voice"));
        }}
      >
        {mode === "voice" ? (
          <IconKeyboard className="h-6 w-6" />
        ) : (
          <IconMicrophone className="h-6 w-6" />
        )}
      </button>

      {mode === "text" && !showUserWaveform ? (
        <>
          <input
            className="h-12 flex-1 rounded-full border border-[#dcd4e7] bg-white px-5 text-sm text-[#2b2233] placeholder-[#9b92ad] outline-none focus:border-[#5a42cc] disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Type your response..."
            type="text"
            value={chatMessage}
            disabled={isInputDisabled}
            onChange={(event) => setChatMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <button
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(90deg,#4F33A3_0%,#6A4DF5_100%)] text-white shadow-[0_8px_20px_rgba(93,72,220,0.35)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isInputDisabled || !chatMessage.trim()}
            type="button"
            onClick={handleSendMessage}
          >
            <SendHorizontal className="h-4 w-4" />
          </button>
        </>
      ) : showUserWaveform ? (
        <button
          className="flex h-12 flex-1 items-center rounded-full border border-[#dcd4e7] bg-white px-5 text-left disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          disabled={isInputDisabled}
          onClick={handleVoiceToggle}
        >
          <LiveWaveform
            active={props.ptt.isRecording}
            bars={24}
            className="flex-1"
            processing={false}
          />
          <span className="ml-2">
            <IconSend2 className="h-6 w-6" />
          </span>
        </button>
      ) : (
        <button
          className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[linear-gradient(90deg,#4F33A3_0%,#6A4DF5_100%)] px-5 text-sm font-medium text-white shadow-[0_8px_20px_rgba(93,72,220,0.35)] transition ${
            isVoiceDisabled ? "cursor-not-allowed opacity-50" : ""
          }`}
          disabled={isVoiceDisabled}
          type="button"
          onClick={handleVoiceToggle}
        >
          <IconMicrophone className="h-4 w-4" />
          {props.ptt.isProcessing
            ? "Processing..."
            : props.ptt.isAvailable
              ? "Tap to speak"
              : "Waiting for agent"}
        </button>
      )}
    </div>
  );
}
