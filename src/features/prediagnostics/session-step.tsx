import { memo, useCallback, useMemo, useState } from "react";
import {
  useChat,
  useSession,
  type UseSessionReturn,
} from "@livekit/components-react";
import { TokenSource } from "livekit-client";
import { LoaderCircle, SendHorizontal } from "lucide-react";
import { IconMicrophone, IconPhoneOff } from "@tabler/icons-react";

import { AgentChatIndicator } from "#/components/agents-ui/agent-chat-indicator";
import { AgentControlBar } from "#/components/agents-ui/agent-control-bar";
import { AgentSessionProvider } from "#/components/agents-ui/agent-session-provider";
import { StartAudioButton } from "#/components/agents-ui/start-audio-button";
import { Button } from "#/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "#/components/ui/conversation";
import { LiveWaveform } from "#/components/ui/live-waveform";
import { Message, MessageContent } from "#/components/ui/message";
import type {
  PrediagnosticsConnectionDetails,
  PrediagnosticsInteractionMode,
} from "#/lib/livekit/prediagnostics";
import { usePrediagnosticsSessionAdapter } from "#/features/prediagnostics/hooks/use-prediagnostics-session-adapter";
import type { PrediagnosticsMessage } from "#/features/prediagnostics/hooks/use-prediagnostics-messages";

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

export function PrediagnosticsSessionStep(
  props: PrediagnosticsSessionStepProps,
) {
  const tokenSource = useMemo(
    () =>
      TokenSource.literal({
        serverUrl: props.connectionDetails.serverUrl,
        participantToken: props.connectionDetails.participantToken,
      }),
    [props.connectionDetails],
  );

  return <PrediagnosticsLiveKitSession {...props} tokenSource={tokenSource} />;
}

function PrediagnosticsLiveKitSession(
  props: PrediagnosticsSessionStepProps & {
    tokenSource: ReturnType<typeof TokenSource.literal>;
  },
) {
  const session = useSession(props.tokenSource);

  return (
    <AgentSessionProvider session={session}>
      <PrediagnosticsLiveKitSessionContent {...props} session={session} />
    </AgentSessionProvider>
  );
}

function PrediagnosticsLiveKitSessionContent(
  props: PrediagnosticsSessionStepProps & {
    session: UseSessionReturn;
  },
) {
  const adapter = usePrediagnosticsSessionAdapter({
    connectionDetails: props.connectionDetails,
    session: props.session,
    sessionId: props.sessionId,
    onFinished: props.onFinished,
  });

  const handleEndClick = useCallback(() => {
    void adapter.requestDisconnect();
  }, [adapter]);

  return (
    <div className="min-h-screen bg-[#F5F3F7]">
      <div className="min-h-screen md:flex md:items-center md:justify-center md:px-6">
        <div className="relative h-screen w-full md:h-190 md:max-w-105">
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
                coach={props.connectionDetails.coach}
                isEnding={adapter.isEnding}
                onEnd={handleEndClick}
              />
              <ChatTranscript
                messages={adapter.displayMessages}
                showAgentPendingBubble={adapter.showAgentPendingBubble}
                showUserPendingBubble={adapter.showUserPendingBubble}
              />
              {adapter.endError ? (
                <div className="border-t border-[#f1d1d5] bg-[#fff7f8] px-5 py-3 text-sm text-[#a03d4d]">
                  {adapter.endError}
                </div>
              ) : null}
              <SessionFooter
                interactionMode={props.connectionDetails.interactionMode}
                agentCanListen={adapter.agentCanListen}
                agentIsSpeaking={adapter.agentIsSpeaking}
                agentIsThinking={adapter.agentIsThinking}
                isEnding={adapter.isEnding}
                ptt={adapter.ptt}
                userCanSpeak={adapter.userCanSpeak}
              />
            </div>
            <div className="absolute right-4 bottom-4">
              <StartAudioButton
                label="Enable audio"
                size="sm"
                variant="secondary"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionHeader(props: {
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
          className="h-9 w-9 rounded-full object-cover ring-2 ring-[#eee8f5]"
          src={coachMeta.imageSrc}
        />
        <h1 className="text-lg font-semibold text-[#2b2233]">
          Pre-Diagnostic Session
        </h1>
      </div>

      <Button
        size={"icon"}
        variant="outline"
        type="button"
        disabled={props.isEnding}
        onClick={props.onEnd}
        className="rounded-full bg-red-50/70 text-red-500  hover:bg-red-100/80"
      >
        {props.isEnding ? (
          <LoaderCircle className="h-5 w-5 animate-spin" />
        ) : (
          <IconPhoneOff className="h-5 w-5 text-red-500" />
        )}
      </Button>
    </header>
  );
}

const ChatTranscript = memo(function ChatTranscript(props: {
  messages: PrediagnosticsMessage[];
  showAgentPendingBubble: boolean;
  showUserPendingBubble: boolean;
}) {
  if (
    !props.messages.length &&
    !props.showAgentPendingBubble &&
    !props.showUserPendingBubble
  ) {
    return (
      <Conversation className="bg-transparent">
        <ConversationEmptyState
          className="text-[#7f768f]"
          title="Waiting for agent to join..."
          description={null}
        />
      </Conversation>
    );
  }

  return (
    <Conversation className="bg-transparent">
      <ConversationContent className="space-y-0 px-5 py-4">
        {props.messages.map((message, index) => (
          <Message
            key={`${message.id}-${index}`}
            from={message.role === "user" ? "user" : "assistant"}
            className="py-1.5"
          >
            <MessageContent
              className={
                message.role === "user"
                  ? "rounded-2xl bg-[linear-gradient(135deg,#4F33A3_0%,#6A4DF5_100%)] text-white shadow-[0_12px_28px_rgba(93,72,220,0.22)]"
                  : "rounded-2xl bg-white text-[#2b2233] shadow-sm"
              }
            >
              <p className="text-sm leading-relaxed">{message.text}</p>
            </MessageContent>
          </Message>
        ))}
        {props.showUserPendingBubble ? <PendingBubble isUser /> : null}
        {props.showAgentPendingBubble ? <PendingBubble isUser={false} /> : null}
      </ConversationContent>
    </Conversation>
  );
});

const PendingBubble = memo(function PendingBubble(props: { isUser: boolean }) {
  return (
    <div className="py-2">
      <div className={`flex ${props.isUser ? "justify-end" : "justify-start"}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            props.isUser
              ? "bg-[linear-gradient(135deg,#4F33A3_0%,#6A4DF5_100%)] text-white shadow-[0_12px_28px_rgba(93,72,220,0.22)]"
              : "bg-white text-[#2b2233] shadow-sm"
          }`}
        >
          <AgentChatIndicator size="md" />
        </div>
      </div>
    </div>
  );
});

function SessionFooter(props: {
  interactionMode: PrediagnosticsInteractionMode;
  agentCanListen: boolean;
  agentIsSpeaking: boolean;
  agentIsThinking: boolean;
  isEnding: boolean;
  ptt: ReturnType<
    typeof import("#/features/prediagnostics/hooks/use-push-to-talk").usePrediagnosticsPushToTalk
  >;
  userCanSpeak: boolean;
}) {
  if (props.interactionMode === "auto") {
    return <AutoSessionFooter {...props} />;
  }

  return <PttSessionFooter {...props} />;
}

function AutoSessionFooter(props: {
  agentCanListen: boolean;
  agentIsThinking: boolean;
  isEnding: boolean;
  userCanSpeak: boolean;
}) {
  const isInputDisabled =
    !props.userCanSpeak || props.agentIsThinking || !props.agentCanListen;

  return (
    <div className="px-4 pb-4">
      <AgentControlBar
        variant="livekit"
        isConnected
        saveUserChoices
        controls={{
          leave: false,
          microphone: true,
          camera: false,
          screenShare: false,
          chat: true,
        }}
        className={isInputDisabled ? "pointer-events-none opacity-70" : ""}
      />
    </div>
  );
}

function PttSessionFooter(props: {
  agentCanListen: boolean;
  agentIsSpeaking: boolean;
  agentIsThinking: boolean;
  isEnding: boolean;
  ptt: ReturnType<
    typeof import("#/features/prediagnostics/hooks/use-push-to-talk").usePrediagnosticsPushToTalk
  >;
  userCanSpeak: boolean;
}) {
  const { send } = useChat();
  const [chatMessage, setChatMessage] = useState("");

  const isInputDisabled = !props.userCanSpeak;
  const hasTypedMessage = chatMessage.trim().length > 0;
  const showWaveform = props.ptt.isRecording || props.ptt.isProcessing;
  const isVoiceDisabled =
    !props.agentCanListen ||
    props.ptt.isProcessing ||
    props.agentIsSpeaking ||
    props.agentIsThinking ||
    isInputDisabled;

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

  return (
    <div className="mx-4 mb-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 flex-1 items-center rounded-full bg-slate-100 px-3 border border-slate-200">
          {showWaveform ? (
            <LiveWaveform
              active={props.ptt.isRecording}
              processing={props.ptt.isProcessing}
              mode="scrolling"
              height="100%"
              historySize={48}
              barWidth={3}
              barGap={2}
              className="h-full w-full"
            />
          ) : (
            <input
              className="h-full w-full bg-transparent text-sm text-[#2b2233] placeholder-[#9b92ad] outline-none disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={
                props.agentCanListen
                  ? "Type your response..."
                  : "Waiting for agent"
              }
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
          )}
        </div>
        {hasTypedMessage && !showWaveform ? (
          <Button
            size={"icon"}
            variant="default"
            disabled={isInputDisabled || !hasTypedMessage}
            type="button"
            onClick={handleSendMessage}
            className="rounded-full"
          >
            <SendHorizontal className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            size={"icon"}
            variant="default"
            type="button"
            disabled={isVoiceDisabled}
            onClick={handleVoiceToggle}
            className="rounded-full"
          >
            {props.ptt.isProcessing ? (
              <AgentChatIndicator size="sm" />
            ) : (
              <IconMicrophone className="h-5 w-5" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
