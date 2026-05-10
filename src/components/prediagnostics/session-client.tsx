"use client";

import {
  RoomAudioRenderer,
  SessionProvider,
  useAgent,
  useRemoteParticipants,
  useSession,
  useSessionContext,
  useSessionMessages,
} from "@livekit/components-react";
import {
  ConnectionState as LKConnectionState,
  ParticipantKind,
  RpcError,
  TokenSource,
} from "livekit-client";
import { Mic, PhoneOff, SendHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type ChatMessage,
  ChatMessageBubble,
  type ChatStatus,
  TypingIndicator,
} from "@/components/prediagnostics/chat-ui";
import { Button } from "@/components/ui/button";
import { LiveWaveform } from "@/components/ui/live-waveform";
import { Input } from "../ui/input";

interface SessionPageClientProps {
  token: string;
  serverUrl: string;
  roomName: string;
  sessionId: string;
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
  video = false,
  interactionMode = "ptt",
  completeEndpoint = "/api/sessions/end",
  redirectUrl,
}: SessionPageClientProps) {
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
      <SessionContent
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

function SessionContent({
  roomName: _roomName,
  sessionId,
  video = false,
  interactionMode = "ptt",
  completeEndpoint = "/api/sessions/end",
  redirectUrl,
}: {
  roomName: string;
  sessionId: string;
  video?: boolean;
  interactionMode?: "ptt" | "auto";
  completeEndpoint?: string;
  redirectUrl?: string;
}) {
  const session = useSessionContext();
  const agent = useAgent();
  const remoteParticipants = useRemoteParticipants();
  const { messages: sessionMessages, send: sendMessage } = useSessionMessages();

  const [status, setStatus] = useState<ChatStatus>("idle");
  const [isRecording, setIsRecording] = useState(false);
  const [chatText, setChatText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);

  const agentParticipant = useMemo(
    () => remoteParticipants.find((p) => p.kind === ParticipantKind.AGENT),
    [remoteParticipants],
  );

  // Map LiveKit session messages to our ChatMessage format
  const messages: ChatMessage[] = useMemo(() => {
    return sessionMessages.map((msg: unknown) => {
      const m = msg as {
        id: string;
        type?: string;
        message?: string;
        timestamp: number;
        from?: { kind?: number; identity?: string };
      };

      const isAgent =
        m.type === "agentTranscript" ||
        (m.type === "chatMessage" && m.from?.kind === ParticipantKind.AGENT);

      return {
        id: m.id,
        role: isAgent ? "agent" : "user",
        content: m.message || "",
        timestamp: new Date(m.timestamp),
      };
    });
  }, [sessionMessages]);

  // Auto-start session on mount
  useEffect(() => {
    if (hasStartedRef.current) return;
    if (session.connectionState !== LKConnectionState.Disconnected) return;

    hasStartedRef.current = true;
    const isPtt = interactionMode === "ptt";
    void session.start({
      tracks: {
        microphone: { enabled: !isPtt },
        camera: video ? { enabled: true } : undefined,
      },
    });
  }, [session, video, interactionMode]);

  // Agent state tracking
  const agentConnected = agent.isConnected || agent.canListen;
  const agentIsSpeaking = agent.state === "speaking";
  const agentIsThinking = agent.state === "thinking";

  useEffect(() => {
    if (agentIsSpeaking) {
      setStatus("speaking");
    } else if (agentIsThinking) {
      setStatus("processing");
    } else if (status === "speaking" || status === "processing") {
      const timer = setTimeout(() => setStatus("idle"), 500);
      return () => clearTimeout(timer);
    }
  }, [agentIsSpeaking, agentIsThinking, status]);

  // Auto-scroll to bottom
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status]);

  const sendRpc = useCallback(
    async (method: "start_turn" | "end_turn") => {
      if (!agentParticipant || !session.room?.localParticipant) return;
      try {
        await session.room.localParticipant.performRpc({
          destinationIdentity: agentParticipant.identity,
          method,
          payload: "",
          responseTimeout: 30000,
        });
      } catch (error) {
        if (error instanceof RpcError) {
          console.warn(`${method} RPC not implemented:`, error.message);
        } else {
          console.error(`${method} RPC error:`, error);
        }
      }
    },
    [agentParticipant, session.room],
  );

  const handleToggleVoice = useCallback(async () => {
    if (!session.room?.localParticipant) return;

    const nextRecording = !isRecording;
    setIsRecording(nextRecording);
    await session.room.localParticipant.setMicrophoneEnabled(nextRecording);

    if (interactionMode === "ptt" && agentParticipant) {
      if (nextRecording) {
        void sendRpc("start_turn");
        setStatus("recording");
      } else {
        void sendRpc("end_turn");
        setStatus("processing");
        setTimeout(() => setStatus("idle"), 1500);
      }
      return;
    }

    if (nextRecording) {
      setStatus("recording");
    } else {
      setStatus("processing");
      setTimeout(() => setStatus("idle"), 1500);
    }
  }, [session.room, isRecording, interactionMode, agentParticipant, sendRpc]);

  const isInputDisabled = !agentConnected || agentIsSpeaking || agentIsThinking;
  const hasTypedMessage = chatText.trim().length > 0;

  const handleSendText = useCallback(async () => {
    if (isInputDisabled) return;

    const text = chatText.trim();
    if (!text) return;

    await sendMessage(text);
    setChatText("");

    setStatus("processing");
    setTimeout(() => setStatus("idle"), 1500);
  }, [chatText, isInputDisabled, sendMessage]);

  const handleEndCall = useCallback(async () => {
    await session.end();
    await fetch(completeEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {});
    const destination =
      redirectUrl ?? `/prediagnostics/report?session=${sessionId}`;
    window.location.href = destination;
  }, [completeEndpoint, redirectUrl, session, sessionId]);

  const showConnectingSpinner =
    (session.connectionState === LKConnectionState.Connecting ||
      agent.state === "connecting") &&
    !agentConnected;

  if (
    session.connectionState === LKConnectionState.Disconnected &&
    !agent.isFinished
  ) {
    return (
      <div className="flex h-svh items-center justify-center bg-background px-4">
        <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 text-center">
          <p className="text-lg font-medium">Connection lost</p>
          <p className="text-sm text-muted-foreground">
            The session connection was lost.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => window.location.reload()}>Retry</Button>
            <Button variant="ghost" onClick={handleEndCall}>
              Go to report
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-svh w-full flex-col bg-background">
      {/* Header */}
      <header className="w-full mx-auto sticky top-0 z-10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex flex-col">
            <h1 className="text-base font-semibold">Pre-Diagnostic Session</h1>
          </div>

          <Button
            variant="destructive"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleEndCall}
          >
            <PhoneOff className="size-4 mr-2" />
            End
          </Button>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto max-w-lg w-full mx-auto "
      >
        <div className="space-y-4 px-4 py-6">
          {showConnectingSpinner && messages.length === 0 && (
            <div className="flex min-h-50 flex-col items-center justify-center gap-3">
              <div className="size-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
              <p className="text-sm text-muted-foreground">
                Connecting to session...
              </p>
            </div>
          )}

          {!showConnectingSpinner && messages.length === 0 && (
            <div className="flex min-h-50 items-center justify-center">
              <p className="text-center text-sm text-muted-foreground">
                {agentConnected && "Waiting for the agent to join..."}
              </p>
            </div>
          )}

          {messages.map((msg, index) => (
            <ChatMessageBubble
              key={msg.id}
              message={msg}
              isLast={index === messages.length - 1}
            />
          ))}
          {agentConnected && status === "processing" && messages.length > 0 && (
            <TypingIndicator />
          )}
        </div>
      </div>

      {/* Footer input */}
      <footer className="max-w-lg w-full mx-auto border rounded-lg bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 mb-4">
        <div className="flex items-center gap-3 p-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
          <div className="flex h-10 flex-1 ">
            {isRecording ? (
              <LiveWaveform
                active
                barWidth={2}
                barGap={2}
                className="h-full w-full"
                height="100%"
                historySize={48}
                mode="scrolling"
              />
            ) : (
              <Input
                className="border-none shadow-none outline-none bg-transparent focus-visible:ring-0"
                disabled={isInputDisabled}
                placeholder="Type your response..."
                type="text"
                value={chatText}
                onChange={(event) => setChatText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSendText();
                  }
                }}
              />
            )}
          </div>
          {hasTypedMessage && !isRecording ? (
            <Button
              className="size-10 rounded-full"
              disabled={isInputDisabled || !hasTypedMessage}
              size="icon"
              type="button"
              onClick={() => void handleSendText()}
            >
              <SendHorizontal className="size-5" />
            </Button>
          ) : (
            <Button
              className="size-10 rounded-full"
              disabled={isInputDisabled}
              size="icon"
              type="button"
              onClick={() => void handleToggleVoice()}
            >
              <Mic className="size-5" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
