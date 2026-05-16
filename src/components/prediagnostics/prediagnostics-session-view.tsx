"use client";

import {
  useAgent,
  useRemoteParticipants,
  useSessionContext,
  useSessionMessages,
} from "@livekit/components-react";
import {
  ConnectionState as LKConnectionState,
  ParticipantKind,
  RoomEvent,
  RpcError,
} from "livekit-client";
import {
  MessageSquareTextIcon,
  Mic,
  MicOff,
  PhoneOff,
  SendHorizontal,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  EndSessionDialog,
  useEndSessionDialog,
} from "@/components/diagnostics/end-session-dialog";
import { Button } from "@/components/ui/button";
import { LiveWaveform } from "@/components/ui/live-waveform";
import { cn } from "@/lib/utils";
import { AgentChatTranscript } from "../agents-ui/agent-chat-transcript";

interface PrediagnosticsSessionViewProps {
  roomName: string;
  sessionId: string;
  video?: boolean;
  interactionMode?: "ptt" | "auto";
  completeEndpoint?: string;
  redirectUrl?: string;
}

export function PrediagnosticsSessionView({
  roomName: _roomName,
  sessionId,
  video = false,
  interactionMode = "ptt",
  completeEndpoint = "/api/sessions/end",
  redirectUrl,
}: PrediagnosticsSessionViewProps) {
  const session = useSessionContext();
  const agent = useAgent();
  const remoteParticipants = useRemoteParticipants();
  const { messages: sessionMessages, send: sendMessage } = useSessionMessages();

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [chatText, setChatText] = useState("");
  const hasStartedRef = useRef(false);
  const hasAutoRedirectedRef = useRef(false);
  const hasBeenConnectedRef = useRef(false);
  const isEndingRef = useRef(false);

  const {
    isOpen: dialogOpen,
    dialogMode,
    promptEnd,
    close: closeDialog,
  } = useEndSessionDialog();

  const agentParticipant = remoteParticipants.find(
    (p) => p.kind === ParticipantKind.AGENT,
  );

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

  useEffect(() => {
    if (session.connectionState === LKConnectionState.Connected) {
      hasBeenConnectedRef.current = true;
    }
  }, [session.connectionState]);

  const agentIsSpeaking = agent.state === "speaking";
  const agentIsThinking = agent.state === "thinking";
  const isInputDisabled =
    !session.isConnected ||
    !agentParticipant ||
    agentIsSpeaking ||
    agentIsThinking;
  const hasTypedMessage = chatText.trim().length > 0;

  const completeAndRedirect = useCallback(async () => {
    if (hasAutoRedirectedRef.current) return;
    hasAutoRedirectedRef.current = true;
    await fetch(completeEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {});
    window.location.href =
      redirectUrl ?? `/prediagnostics/report?session=${sessionId}`;
  }, [completeEndpoint, redirectUrl, sessionId]);

  useEffect(() => {
    const handleAgentDisconnected = (participant: { kind: number }) => {
      if (participant.kind !== ParticipantKind.AGENT) return;
      if (!hasBeenConnectedRef.current || isEndingRef.current) return;
      void completeAndRedirect();
    };

    session.room.on(RoomEvent.ParticipantDisconnected, handleAgentDisconnected);
    return () => {
      session.room.off(
        RoomEvent.ParticipantDisconnected,
        handleAgentDisconnected,
      );
    };
  }, [completeAndRedirect, session.room]);

  useEffect(() => {
    if (
      hasBeenConnectedRef.current &&
      agent.isFinished &&
      !hasAutoRedirectedRef.current
    ) {
      void completeAndRedirect();
    }
  }, [agent.isFinished, completeAndRedirect]);

  const sendRpc = useCallback(
    async (method: "start_turn" | "end_turn") => {
      if (!agentParticipant || !session.room.localParticipant) return;
      try {
        await session.room.localParticipant.performRpc({
          destinationIdentity: agentParticipant.identity,
          method,
          payload: "",
          responseTimeout: 30_000,
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
    if (isInputDisabled || !session.room.localParticipant) return;

    const nextRecording = !isRecording;
    setIsRecording(nextRecording);
    await session.room.localParticipant.setMicrophoneEnabled(nextRecording);

    if (interactionMode === "ptt") {
      void sendRpc(nextRecording ? "start_turn" : "end_turn");
    }
  }, [
    interactionMode,
    isInputDisabled,
    isRecording,
    sendRpc,
    session.room.localParticipant,
  ]);

  const handleSendText = useCallback(async () => {
    if (isInputDisabled) return;
    const text = chatText.trim();
    if (!text) return;
    await sendMessage(text);
    setChatText("");
  }, [chatText, isInputDisabled, sendMessage]);

  const handleEndCall = useCallback(async () => {
    if (isEndingRef.current) return;
    isEndingRef.current = true;
    setIsRecording(false);
    await session.room.localParticipant
      ?.setMicrophoneEnabled(false)
      .catch(() => {});
    await session.end();
    await completeAndRedirect();
  }, [completeAndRedirect, session]);

  const showConnectingSpinner =
    (session.connectionState === LKConnectionState.Connecting ||
      agent.state === "connecting") &&
    !agentParticipant;

  if (session.connectionState === LKConnectionState.Disconnected) {
    if (hasBeenConnectedRef.current && agent.isFinished) {
      void completeAndRedirect();
      return null;
    }

    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#1B1238] px-4">
        <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 text-center">
          <p className="text-lg font-medium text-white">Connection lost</p>
          <p className="text-sm text-white/60">
            The session connection was lost.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => window.location.reload()}>Retry</Button>
            <Button
              variant="ghost"
              onClick={() => promptEnd(sessionMessages.length)}
            >
              Go to report
            </Button>
          </div>
          <EndSessionDialog
            isOpen={dialogOpen}
            mode={dialogMode}
            onClose={closeDialog}
            onConfirmEnd={() => void handleEndCall()}
            onContinue={closeDialog}
          />
        </div>
      </div>
    );
  }

  return (
    <main className="relative flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-[#1B1238]">
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
      <header className="relative z-10 flex shrink-0 items-center justify-between px-4 py-3">
        <h1 className="text-sm font-semibold text-white md:text-base">
          Pre-Diagnostic Session
        </h1>
        <Button
          size={"lg"}
          type="button"
          variant="destructive"
          className="rounded-full px-4 font-semibold"
          onClick={() => promptEnd(sessionMessages.length)}
        >
          <PhoneOff className="mr-2 size-4" />
          End
        </Button>
      </header>

      {/* Main content */}
      <section className="relative z-10 mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col overflow-hidden px-4">
        {showConnectingSpinner && (
          <div className="flex justify-center py-4">
            <div className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/60 shadow-sm backdrop-blur-md">
              Connecting to session...
            </div>
          </div>
        )}

        <AgentChatTranscript
          className="min-h-0 w-full flex-1 overflow-y-auto text-white"
          agentState={agent.state}
          messages={sessionMessages}
        />
      </section>

      {/* Footer */}
      <footer className="relative z-10 shrink-0 px-3 pb-3 md:px-6 md:pb-6">
        {sessionMessages.length === 0 && (
          <p className="pointer-events-none mx-auto block w-full max-w-xl pb-4 text-center text-sm font-semibold text-white/60">
            Agent is listening, ask it a question
          </p>
        )}
        <SessionControlBar
          chatText={chatText}
          disabled={isInputDisabled}
          hasTypedMessage={hasTypedMessage}
          isChatOpen={isChatOpen}
          isRecording={isRecording}
          onChatTextChange={setChatText}
          onChatToggle={() => setIsChatOpen((v) => !v)}
          onSendText={handleSendText}
          onToggleVoice={handleToggleVoice}
        />
      </footer>

      <EndSessionDialog
        isOpen={dialogOpen}
        mode={dialogMode}
        onClose={closeDialog}
        onConfirmEnd={() => void handleEndCall()}
        onContinue={closeDialog}
      />
    </main>
  );
}

function SessionControlBar({
  chatText,
  disabled,
  hasTypedMessage,
  isChatOpen,
  isRecording,
  onChatTextChange,
  onChatToggle,
  onSendText,
  onToggleVoice,
}: {
  chatText: string;
  disabled: boolean;
  hasTypedMessage: boolean;
  isChatOpen: boolean;
  isRecording: boolean;
  onChatTextChange: (value: string) => void;
  onChatToggle: () => void;
  onSendText: () => Promise<void>;
  onToggleVoice: () => Promise<void>;
}) {
  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="w-full overflow-hidden shadow-md backdrop-blur-md">
        {isChatOpen && (
          <div className="mb-3 flex w-full items-end gap-2 border rounded-3xl border-white/15 p-3 bg-white/10">
            <textarea
              className="field-sizing-content max-h-16 min-h-8 flex-1 resize-none bg-transparent py-2 text-sm text-white [scrollbar-width:thin] placeholder:text-white/40 focus:outline-none disabled:opacity-50"
              disabled={disabled}
              placeholder="Type your response..."
              value={chatText}
              onChange={(event) => onChatTextChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void onSendText();
                }
              }}
            />
            <Button
              className="rounded-full bg-white/20 text-white hover:bg-white/30"
              disabled={disabled || !hasTypedMessage || isRecording}
              size="icon"
              type="button"
              onClick={() => void onSendText()}
            >
              <SendHorizontal className="size-5" />
            </Button>
          </div>
        )}

        <div className="flex w-full min-w-0 items-center justify-between gap-3 p-2">
          {/* Chat toggle */}
          <Button
            aria-label="Toggle text response"
            className={cn(
              "relative h-12 w-12 shrink-0 rounded-full border border-white/15 bg-white/10 text-white transition-all duration-200 hover:bg-white/20",
              isChatOpen && "bg-white/20",
            )}
            size="icon"
            type="button"
            variant="ghost"
            onClick={onChatToggle}
          >
            <MessageSquareTextIcon className="size-5" />
          </Button>

          {/* Mic / PTT — stretches full width */}
          <Button
            aria-label={isRecording ? "Stop talking" : "Start talking"}
            className={cn(
              "relative h-12 min-w-12 rounded-full border border-white/15 transition-all duration-500",
              "bg-white/10 text-white hover:bg-white/20",
              isRecording && "bg-lavender text-[#1B1238] flex-1",
            )}
            size={isRecording ? "default" : "icon"}
            disabled={disabled}
            type="button"
            onClick={() => void onToggleVoice()}
          >
            {isRecording ? (
              <div className="flex w-full items-center gap-2 px-2">
                <div className="min-w-0 flex-1 overflow-hidden">
                  <LiveWaveform
                    active={isRecording}
                    height="32px"
                    mode="scrolling"
                    className="text-current"
                  />
                </div>

                <span className="relative flex size-5 shrink-0 items-center justify-center">
                  <Mic className="size-5" />
                  <span className="absolute -inset-1 rounded-full bg-black opacity-20 animate-ping" />
                </span>
              </div>
            ) : (
              <MicOff className="size-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
