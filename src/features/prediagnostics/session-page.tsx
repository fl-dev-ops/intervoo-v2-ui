import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RoomAudioRenderer,
  SessionProvider,
  StartAudio,
  useAgent,
  useSession,
  useSessionContext,
  useSessionMessages,
  type UseSessionReturn,
} from "@livekit/components-react";
import { TokenSource } from "livekit-client";
import { LoaderCircle, Mic, SendHorizontal } from "lucide-react";
import type { PrediagnosticsConnectionDetails } from "#/lib/livekit/prediagnostics";
import { usePrediagnosticsConnectionDetails } from "#/features/prediagnostics/hooks/use-connection-details";
import { usePrediagnosticsPushToTalk } from "#/features/prediagnostics/hooks/use-push-to-talk";

export function PrediagnosticsSessionPage() {
  const { connectionDetails, error, isLoading, refreshConnectionDetails } =
    usePrediagnosticsConnectionDetails();

  useEffect(() => {
    void refreshConnectionDetails().catch(() => {});
  }, [refreshConnectionDetails]);

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

  return <LiveKitSession tokenSource={tokenSource} />;
}

function LiveKitSession({ tokenSource }: { tokenSource: ReturnType<typeof TokenSource.literal> }) {
  const session = useSession(tokenSource);

  return (
    <SessionProvider session={session}>
      <LiveKitSessionContent session={session} />
      <StartAudio label="Enable audio" />
      <RoomAudioRenderer />
    </SessionProvider>
  );
}

function LiveKitSessionContent({ session }: { session: UseSessionReturn }) {
  const { isConnected, start, end } = useSessionContext();
  const agent = useAgent(session);
  const { messages, send } = useSessionMessages(session);
  const [started, setStarted] = useState(false);
  const [hasSeenActiveSession, setHasSeenActiveSession] = useState(false);

  useEffect(() => {
    if (!started && !isConnected) {
      setStarted(true);
      start({
        tracks: {
          microphone: {
            enabled: false,
          },
        },
      }).catch(console.error);
    }
  }, [isConnected, start, started]);

  const handleSessionEnd = useCallback(async () => {
    await end();
    window.location.href = "/prediagnostics/report";
  }, [end]);

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
      void handleSessionEnd();
    }
  }, [agent.isFinished, handleSessionEnd, hasSeenActiveSession]);

  return (
    <div className="flex h-screen flex-col bg-[#F5F3F7]">
      <SessionHeader agentState={agent.state} onEnd={() => void handleSessionEnd()} />
      <ChatTranscript messages={messages} />
      <PushToTalkControls send={send} />
    </div>
  );
}

function SessionHeader({
  agentState,
  onEnd,
}: {
  agentState: string | undefined;
  onEnd: () => void;
}) {
  return (
    <header className="flex items-center justify-between border-b border-[#e5e0ed] bg-white px-5 py-4">
      <div>
        <h1 className="text-lg font-semibold text-[#2b2233]">Pre-Diagnostic Session</h1>
        <p className="text-sm text-[#7f768f]">{getAgentStateLabel(agentState)}</p>
      </div>

      <button
        className="rounded-full border border-[#e5e0ed] px-4 py-2 text-sm font-medium text-[#7f768f] transition hover:bg-[#f5f3f7]"
        type="button"
        onClick={onEnd}
      >
        End session
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

function ChatTranscript({
  messages,
}: {
  messages: Array<{
    type?: string;
    message?: string;
  }>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-[#7f768f]">Waiting for conversation...</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
      <div className="space-y-3">
        {messages.map((message, index) => {
          const isUser = message.type === "userTranscript" || message.type === "chat";
          const text = message.message ?? "";
          const messageKey = text
            ? `${message.type ?? "message"}-${text}-${index}`
            : `${message.type ?? "message"}-${index}`;

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

function PushToTalkControls({ send }: { send: (text: string) => Promise<unknown> }) {
  const ptt = usePrediagnosticsPushToTalk();
  const [chatMessage, setChatMessage] = useState("");

  const handleSendMessage = useCallback(() => {
    const nextMessage = chatMessage.trim();

    if (!nextMessage) {
      return;
    }

    void send(nextMessage);
    setChatMessage("");
  }, [chatMessage, send]);

  return (
    <div className="border-t border-[#e5e0ed] bg-white px-5 py-4">
      <div className="flex items-center gap-3">
        <button
          className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-sm font-medium transition ${
            ptt.isRecording
              ? "bg-[#5a42cc] text-white shadow-[0_8px_20px_rgba(93,72,220,0.35)]"
              : "border border-[#e5e0ed] text-[#5a42cc] hover:bg-[#f5f3f7]"
          } ${ptt.isAgentSpeaking || !ptt.isAvailable ? "cursor-not-allowed opacity-50" : ""}`}
          disabled={ptt.isAgentSpeaking || !ptt.isAvailable || ptt.isProcessing}
          type="button"
          onMouseDown={() => void ptt.startTurn()}
          onMouseUp={() => void ptt.endTurn()}
          onMouseLeave={() => {
            if (ptt.isRecording) {
              void ptt.endTurn();
            }
          }}
          onTouchStart={() => void ptt.startTurn()}
          onTouchEnd={() => void ptt.endTurn()}
        >
          <Mic className="h-4 w-4" />
          {ptt.isRecording
            ? "Release to send"
            : ptt.isProcessing
              ? "Processing..."
              : ptt.isAvailable
                ? "Hold to speak"
                : "Waiting for agent"}
        </button>

        <div className="flex items-center gap-2">
          <input
            className="h-12 flex-1 rounded-full border border-[#e5e0ed] px-4 text-sm text-[#2b2233] placeholder-[#b0a8c0] outline-none focus:border-[#5a42cc]"
            placeholder="Type a message..."
            type="text"
            value={chatMessage}
            onChange={(event) => setChatMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <button
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(90deg,#4F33A3_0%,#6A4DF5_100%)] text-white shadow-[0_8px_20px_rgba(93,72,220,0.35)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!chatMessage.trim()}
            type="button"
            onClick={handleSendMessage}
          >
            <SendHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {ptt.error ? <p className="mt-3 text-sm text-red-500">{ptt.error}</p> : null}
    </div>
  );
}
