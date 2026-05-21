"use client";

import {
  useAgent,
  useRemoteParticipants,
  useSessionContext,
  useSessionMessages,
} from "@livekit/components-react";
import { IconKeyboard, IconMicrophone, IconSend2 } from "@tabler/icons-react";
import {
  ConnectionState as LKConnectionState,
  ParticipantKind,
  RoomEvent,
  RpcError,
} from "livekit-client";
import { PhoneOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { AgentAudioVisualizerAura } from "@/components/agents-ui/agent-audio-visualizer-aura";
import {
  EndSessionDialog,
  useEndSessionDialog,
} from "@/components/diagnostics/end-session-dialog";
import { SessionExitGuard } from "@/components/session/session-exit-guard";
import { Button } from "@/components/ui/button";
import { LiveWaveform } from "@/components/ui/live-waveform";
import { type CoachOption, coachCards } from "@/lib/coaches";
import { AgentChatTranscript } from "../agents-ui/agent-chat-transcript";

interface PrediagnosticsSessionViewProps {
  roomName: string;
  sessionId: string;
  coach?: CoachOption | null;
  video?: boolean;
  interactionMode?: "ptt" | "auto";
  completeEndpoint?: string;
  redirectUrl?: string;
}

export function PrediagnosticsSessionView({
  roomName: _roomName,
  sessionId,
  coach,
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
  const [guardActive, setGuardActive] = useState(true);

  const {
    isOpen: dialogOpen,
    dialogMode,
    promptEnd,
    close: closeDialog,
  } = useEndSessionDialog();

  const agentParticipant = remoteParticipants.find(
    (p) => p.kind === ParticipantKind.AGENT,
  );
  const selectedCoach =
    coachCards.find((item) => item.value === coach) ?? coachCards[0];

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
    flushSync(() => setGuardActive(false));
    await fetch(completeEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {});
    window.location.href = redirectUrl ?? "/prediagnostics/report";
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
      <div className="flex min-h-dvh items-center justify-center bg-white px-4">
        <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 text-center">
          <p className="text-lg font-medium text-black">Connection lost</p>
          <p className="text-sm text-black/60">
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
    <SessionExitGuard
      active={guardActive}
      onExitAttempt={() => promptEnd(sessionMessages.length)}
    >
      <main className="relative flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-white text-black">
        {/* Header */}
        <header className="relative z-10 mx-auto flex w-full max-w-lg shrink-0 items-center justify-between px-4 py-4 ">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full ">
              <AgentAudioVisualizerAura
                audioTrack={agent.microphoneTrack}
                className="h-10"
                color="#a78bfa"
                colorShift={0.6}
                state={agent.state}
                themeMode="light"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-black md:text-base">
                {selectedCoach.title}
              </p>
              <p className="truncate text-xs font-medium text-black/55">
                Pre-Diagnostic Session
              </p>
            </div>
          </div>
          <Button
            size={"lg"}
            type="button"
            className="rounded-full px-4 font-semibold bg-red-500 text-white"
            onClick={() => promptEnd(sessionMessages.length)}
          >
            <PhoneOff className="mr-2 size-4" />
            End
          </Button>
        </header>

        {/* Main content */}
        <section className="w-full flex-1 relative z-10 min-h-0 ">
          <div className="h-full flex flex-col overflow-hidden ">
            {showConnectingSpinner && (
              <div className="flex justify-center py-4">
                <div className="rounded-full bg-gray-100 px-4 py-2 text-sm text-black/60 shadow-sm">
                  Connecting to session...
                </div>
              </div>
            )}

            <AgentChatTranscript
              className="min-h-0 w-full flex-1 overflow-y-auto text-black"
              agentState={agent.state}
              messages={sessionMessages}
            />
          </div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 shrink-0 px-3 pb-3 md:px-6 md:pb-6 max-w-lg mx-auto w-full">
          {/*{sessionMessages.length === 0 && (
          <p className="pointer-events-none mx-auto block w-full max-w-lg pb-4 text-center text-sm font-semibold text-black/55">
            Agent is listening, ask it a question
          </p>
        )}*/}
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
    </SessionExitGuard>
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
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  function resizeTextArea(textArea: HTMLTextAreaElement | null) {
    if (!textArea) return;

    textArea.style.height = "0px";
    textArea.style.height = `${Math.min(textArea.scrollHeight, 112)}px`;
  }

  function setTextAreaRef(textArea: HTMLTextAreaElement | null) {
    textAreaRef.current = textArea;
    resizeTextArea(textArea);
  }

  async function handleVoiceClick() {
    if (isChatOpen) {
      onChatToggle();
    }

    await onToggleVoice();
  }

  return (
    <div className="mx-auto w-full pt-4">
      <div className="flex w-full items-end rounded-[2rem]">
        <div
          className={`shrink-0 overflow-hidden transition-all duration-300 ease-out ${
            isChatOpen ? "mr-0 w-0 opacity-0" : "mr-3 w-12 opacity-100"
          }`}
        >
          <Button
            aria-label="Toggle text response"
            className="relative size-12 shrink-0 rounded-2xl bg-gray-100 text-slate-700 transition-all duration-200 hover:bg-gray-200 hover:text-black disabled:bg-gray-100"
            size="icon"
            type="button"
            variant="ghost"
            aria-hidden={isChatOpen}
            disabled={disabled || isRecording}
            tabIndex={isChatOpen ? -1 : undefined}
            onClick={onChatToggle}
          >
            <IconKeyboard className="size-5" />
          </Button>
        </div>

        <div className="min-w-0 flex-1 transition-all duration-300 ease-out">
          {isChatOpen ? (
            <div className="flex min-h-12 min-w-0 items-end rounded-[1.5rem] border border-gray-200 bg-gray-100 py-1.5 pr-3 pl-4 transition-colors focus-within:border-gray-300">
              <textarea
                ref={setTextAreaRef}
                autoComplete="off"
                className="my-auto max-h-28 min-h-7 min-w-0 flex-1 resize-none appearance-none overflow-y-auto border-0 bg-transparent py-1 text-base leading-6 text-slate-950 shadow-none outline-0 ring-0 [scrollbar-width:thin] placeholder:text-slate-400 focus:border-0 focus:outline-0 focus:ring-0 focus-visible:border-0 focus-visible:outline-0 focus-visible:ring-0 active:border-0 active:outline-0 disabled:opacity-50"
                disabled={disabled || isRecording}
                placeholder="Type your response..."
                rows={1}
                value={chatText}
                onChange={(event) => {
                  onChatTextChange(event.target.value);
                  resizeTextArea(event.currentTarget);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void onSendText();
                  }
                }}
              />
              <Button
                aria-label="Send response"
                className="ml-2 size-9 shrink-0 rounded-full bg-transparent text-slate-800 hover:bg-gray-200 focus-visible:ring-0 active:ring-0"
                disabled={disabled || !hasTypedMessage || isRecording}
                size="icon"
                type="button"
                variant="ghost"
                onClick={() => void onSendText()}
              >
                <IconSend2 className="size-5 shrink-0 text-slate-800" />
              </Button>
            </div>
          ) : isRecording ? (
            <Button
              aria-label="Stop talking"
              className="relative h-12 w-full min-w-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100 px-5 text-slate-800 transition-all duration-300 hover:bg-gray-100"
              disabled={disabled}
              type="button"
              variant="ghost"
              onClick={() => void onToggleVoice()}
            >
              <div className="flex h-full w-full items-center gap-3 overflow-hidden">
                <div className="min-w-0 flex-1 overflow-hidden">
                  <LiveWaveform
                    active={isRecording}
                    className="text-gray-500"
                    height="28px"
                    mode="scrolling"
                  />
                </div>
                <IconSend2 className="size-5 shrink-0 text-slate-800" />
              </div>
            </Button>
          ) : (
            <Button
              aria-label="Start talking"
              className="relative h-12 w-full min-w-0 rounded-full bg-button text-sm  transition-all duration-300"
              disabled={disabled}
              type="button"
              onClick={() => void onToggleVoice()}
            >
              <IconMicrophone className="size-5" />
              Tap to speak
            </Button>
          )}
        </div>

        <div
          className={`shrink-0 overflow-hidden transition-all duration-300 ease-out ${
            isChatOpen ? "ml-3 w-12 opacity-100" : "ml-0 w-0 opacity-0"
          }`}
        >
          <Button
            aria-label="Start talking"
            className="size-12 shrink-0 rounded-full bg-button"
            disabled={disabled}
            size="icon"
            type="button"
            aria-hidden={!isChatOpen}
            tabIndex={isChatOpen ? undefined : -1}
            onClick={() => void handleVoiceClick()}
          >
            <IconMicrophone className="size-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
