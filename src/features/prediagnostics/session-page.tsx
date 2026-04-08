import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  RoomAudioRenderer,
  SessionProvider,
  StartAudio,
  usePersistentUserChoices,
  useAgent,
  useChat,
  useLocalParticipant,
  useSession,
  useSessionContext,
  type UseSessionReturn,
} from "@livekit/components-react";
import { TokenSource } from "livekit-client";
import { LoaderCircle, Mic, SendHorizontal } from "lucide-react";
import { IconKeyboard, IconMicrophone, IconPhoneOff, IconSend2 } from "@tabler/icons-react";

import { LiveWaveform } from "#/components/ui/live-waveform";
import {
  DEFAULT_PREDIAGNOSTICS_INTERACTION_MODE,
  type PrediagnosticsConnectionDetails,
  type PrediagnosticsInteractionMode,
} from "#/lib/livekit/prediagnostics";
import { usePrediagnosticsConnectionDetails } from "#/features/prediagnostics/hooks/use-connection-details";
import {
  type PrediagnosticsMessage,
  usePrediagnosticsMessages,
} from "#/features/prediagnostics/hooks/use-prediagnostics-messages";
import { usePrediagnosticsPushToTalk } from "#/features/prediagnostics/hooks/use-push-to-talk";
import { usePrediagnosticsTranscript } from "#/features/prediagnostics/hooks/use-prediagnostics-transcript";
import type { PrediagnosticsSessionTranscript } from "#/lib/prediagnostics/transcript";

function getPrediagnosticsInteractionMode(): PrediagnosticsInteractionMode {
  return DEFAULT_PREDIAGNOSTICS_INTERACTION_MODE;
}

export function PrediagnosticsSessionPage() {
  const interactionMode = getPrediagnosticsInteractionMode();
  const { connectionDetails, error, isLoading, refreshConnectionDetails } =
    usePrediagnosticsConnectionDetails();

  useEffect(() => {
    void refreshConnectionDetails(interactionMode).catch(() => {});
  }, [interactionMode, refreshConnectionDetails]);

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F5F3F7]">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-[0_20px_40px_rgba(112,88,186,0.12)]">
          <h2 className="text-xl font-semibold text-[#2b2233]">Connection error</h2>
          <p className="mt-3 text-sm leading-6 text-[#7f768f]">{error}</p>
          <button
            className="mt-6 w-full rounded-full bg-[linear-gradient(90deg,#4F33A3_0%,#6A4DF5_100%)] px-6 py-4 text-sm font-medium text-white shadow-[0_12px_24px_rgba(93,72,220,0.28)]"
            type="button"
            onClick={() => {
              window.location.href = "/prediagnostics";
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !connectionDetails) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F5F3F7]">
        <div className="flex flex-col items-center gap-3">
          <LoaderCircle className="h-10 w-10 animate-spin text-[#5a42cc]" />
          <p className="text-sm font-semibold tracking-[0.08em] text-[#6e667b]">Connecting...</p>
        </div>
      </div>
    );
  }

  return <VoiceSession connectionDetails={connectionDetails} />;
}

function VoiceSession({
  connectionDetails,
}: {
  connectionDetails: PrediagnosticsConnectionDetails;
}) {
  const tokenSource = useMemo(() => {
    return TokenSource.literal({
      serverUrl: connectionDetails.serverUrl,
      participantToken: connectionDetails.participantToken,
    });
  }, [connectionDetails]);

  return <LiveKitSession connectionDetails={connectionDetails} tokenSource={tokenSource} />;
}

function LiveKitSession({
  connectionDetails,
  tokenSource,
}: {
  connectionDetails: PrediagnosticsConnectionDetails;
  tokenSource: ReturnType<typeof TokenSource.literal>;
}) {
  const session = useSession(tokenSource);

  return (
    <SessionProvider session={session}>
      <LiveKitSessionContent connectionDetails={connectionDetails} session={session} />
      <StartAudio label="Enable audio" />
      <RoomAudioRenderer />
    </SessionProvider>
  );
}

function LiveKitSessionContent({
  connectionDetails,
  session,
}: {
  connectionDetails: PrediagnosticsConnectionDetails;
  session: UseSessionReturn;
}) {
  const { isConnected, start, end } = useSessionContext();
  const agent = useAgent(session);
  const messages = usePrediagnosticsMessages(session);
  const { getTranscript } = usePrediagnosticsTranscript(messages);
  const { userChoices } = usePersistentUserChoices({ preventSave: true });
  const [started, setStarted] = useState(false);
  const [hasSeenActiveSession, setHasSeenActiveSession] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const hasAgentGreeted = messages.some((m: PrediagnosticsMessage) => m.role === "agent");

  useEffect(() => {
    if (!started && !isConnected) {
      setStarted(true);
      start({
        tracks: {
          microphone: {
            enabled: connectionDetails.interactionMode === "auto",
          },
        },
      }).catch(console.error);
    }
  }, [connectionDetails.interactionMode, isConnected, start, started]);

  const handleSessionEnd = useCallback(
    async (preCapturedTranscript?: PrediagnosticsSessionTranscript) => {
      setIsEnding(true);
      try {
        const transcript = preCapturedTranscript ?? getTranscript();

        const response = await fetch("/api/prediagnostics/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId: connectionDetails.sessionId,
            transcript,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to finalize pre-diagnostic session");
        }
      } catch (error) {
        console.error("[prediagnostics finalize]", error);
      } finally {
        await end();
        window.location.href = "/prediagnostics/report";
      }
    },
    [connectionDetails.sessionId, end, getTranscript],
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

    if (session.room.getActiveDevice("audioinput") === preferredAudioDeviceId) {
      return;
    }

    session.room.switchActiveDevice("audioinput", preferredAudioDeviceId, true).catch(() => {
      void session.room
        .switchActiveDevice("audioinput", preferredAudioDeviceId, false)
        .catch(() => {});
    });
  }, [isConnected, session.room, userChoices.audioDeviceId]);

  return (
    <div className="min-h-screen bg-[#F5F3F7]">
      {/* Desktop: phone preview with gradient glow */}
      <div className="hidden min-h-screen md:flex md:items-center md:justify-center md:px-6">
        <div className="relative h-[85vh] w-100">
          <div
            className="absolute -inset-2 rounded-4xl blur-xl opacity-60"
            style={{
              background:
                "linear-gradient(168.19deg, #7A2CAF -0.95%, #41D69A 26.72%, #DFCF58 60.2%, #5350B4 91.75%)",
            }}
          />
          <div className="relative z-10 w-full h-full rounded-[26px] bg-white overflow-hidden shadow-[0_28px_60px_rgba(74,57,143,0.12)]">
            <div className="flex h-full flex-col">
              <SessionHeader
                agentState={agent.state}
                isEnding={isEnding}
                onEnd={() => {
                  const transcript = getTranscript();
                  void handleSessionEnd(transcript);
                }}
              />
              <ChatTranscript messages={messages} />
              <SessionFooter
                interactionMode={connectionDetails.interactionMode}
                agentState={agent.state}
                hasAgentGreeted={hasAgentGreeted}
                isEnding={isEnding}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: full screen */}
      <div className="flex h-screen flex-col bg-[#F5F3F7] md:hidden">
        <SessionHeader
          agentState={agent.state}
          isEnding={isEnding}
          onEnd={() => {
            const transcript = getTranscript();
            void handleSessionEnd(transcript);
          }}
        />
        <ChatTranscript messages={messages} />
        <SessionFooter
          interactionMode={connectionDetails.interactionMode}
          agentState={agent.state}
          hasAgentGreeted={hasAgentGreeted}
          isEnding={isEnding}
        />
      </div>
    </div>
  );
}

function SessionHeader({
  agentState,
  isEnding,
  onEnd,
}: {
  agentState: string | undefined;
  isEnding: boolean;
  onEnd: () => void;
}) {
  return (
    <header className="flex items-center justify-between border-b border-[#e5e0ed] bg-white px-5 py-4">
      <div>
        <h1 className="text-lg font-semibold text-[#2b2233]">Pre-Diagnostic Session</h1>
        <p className="text-sm text-[#7f768f]">{getAgentStateLabel(agentState)}</p>
      </div>

      <button
        className="flex items-center gap-2 rounded-full border border-[#e5e0ed] px-4 py-2 text-sm font-medium text-[#7f768f] transition hover:bg-[#f5f3f7] disabled:cursor-not-allowed disabled:opacity-50"
        type="button"
        disabled={isEnding}
        onClick={onEnd}
      >
        {isEnding ? (
          <LoaderCircle className="h-6 w-6 animate-spin" />
        ) : (
          <IconPhoneOff className="h-6 w-6" />
        )}
        {isEnding ? "Ending..." : null}
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

function ChatTranscript({ messages }: { messages: PrediagnosticsMessage[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-[#7f768f]">Waiting for agent to join...</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
      <div className="space-y-3">
        {messages.map((message, index) => {
          const isUser = message.role === "user";
          const text = message.text;
          const messageKey = `${message.id}-${index}`;

          return (
            <div key={messageKey} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  isUser ? "bg-[#5a42cc] text-white" : "bg-white text-[#2b2233] shadow-sm"
                }`}
              >
                <p className="text-sm leading-relaxed">{text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SessionFooter({
  interactionMode,
  agentState,
  hasAgentGreeted,
  isEnding,
}: {
  interactionMode: PrediagnosticsInteractionMode;
  agentState: string | undefined;
  hasAgentGreeted: boolean;
  isEnding: boolean;
}) {
  if (interactionMode === "auto") {
    return (
      <AutoSessionFooter
        agentState={agentState}
        hasAgentGreeted={hasAgentGreeted}
        isEnding={isEnding}
      />
    );
  }

  return (
    <PttSessionFooter
      agentState={agentState}
      hasAgentGreeted={hasAgentGreeted}
      isEnding={isEnding}
    />
  );
}

function AutoSessionFooter({
  agentState,
  hasAgentGreeted,
  isEnding,
}: {
  agentState: string | undefined;
  hasAgentGreeted: boolean;
  isEnding: boolean;
}) {
  const { send } = useChat();
  const { localParticipant } = useLocalParticipant();
  const [chatMessage, setChatMessage] = useState("");
  const [mode, setMode] = useState<"voice" | "text">("voice");
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(true);

  const isInputDisabled = isEnding || agentState === "thinking" || !hasAgentGreeted;

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

function PttSessionFooter({
  agentState,
  hasAgentGreeted,
  isEnding,
}: {
  agentState: string | undefined;
  hasAgentGreeted: boolean;
  isEnding: boolean;
}) {
  const { send } = useChat();
  const ptt = usePrediagnosticsPushToTalk();
  const [chatMessage, setChatMessage] = useState("");
  const [mode, setMode] = useState<"voice" | "text">("voice");

  const isInputDisabled = isEnding || agentState === "thinking" || !hasAgentGreeted;

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

  const showUserWaveform = ptt.isRecording;
  const isVoiceDisabled =
    !ptt.isAvailable || ptt.isProcessing || ptt.isAgentSpeaking || isInputDisabled;

  const handleVoiceToggle = useCallback(() => {
    if (isVoiceDisabled) {
      return;
    }

    if (ptt.isRecording) {
      void ptt.endTurn();
      return;
    }

    void ptt.startTurn();
  }, [isVoiceDisabled, ptt]);

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
          <LiveWaveform active={ptt.isRecording} bars={24} className="flex-1" processing={false} />
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
          <Mic className="h-4 w-4" />
          {ptt.isProcessing
            ? "Processing..."
            : ptt.isAvailable
              ? "Tap to speak"
              : "Waiting for agent"}
        </button>
      )}
    </div>
  );
}
