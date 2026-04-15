"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { useChat } from "@livekit/components-react";
import { motion, type MotionProps } from "motion/react";
import { Track } from "livekit-client";
import { Loader, MessageSquareTextIcon, SendHorizontal } from "lucide-react";

import { AgentDisconnectButton } from "@/components/agents-ui/agent-disconnect-button";
import { AgentTrackControl } from "@/components/agents-ui/agent-track-control";
import {
  AgentTrackToggle,
  agentTrackToggleVariants,
} from "@/components/agents-ui/agent-track-toggle";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import {
  useInputControls,
  usePublishPermissions,
  type UseInputControlsProps,
} from "@/hooks/agents-ui/use-agent-control-bar";
import { cn } from "@/lib/utils";

const LK_TOGGLE_VARIANT_1 = [
  "data-[state=off]:bg-slate-100 data-[state=off]:hover:bg-slate-950/10 dark:data-[state=off]:bg-slate-800 dark:data-[state=off]:hover:bg-slate-50/10",
  "data-[state=off]:[&_~_button]:bg-slate-100 data-[state=off]:[&_~_button]:hover:bg-slate-950/10 dark:data-[state=off]:[&_~_button]:bg-slate-800 dark:data-[state=off]:[&_~_button]:hover:bg-slate-50/10",
  "data-[state=off]:border-slate-200 data-[state=off]:hover:border-slate-950/12 dark:data-[state=off]:border-slate-800 dark:data-[state=off]:hover:border-slate-50/12",
  "data-[state=off]:[&_~_button]:border-slate-200 data-[state=off]:[&_~_button]:hover:border-slate-950/12 dark:data-[state=off]:[&_~_button]:border-slate-800 dark:data-[state=off]:[&_~_button]:hover:border-slate-50/12",
  "data-[state=off]:text-red-500 data-[state=off]:hover:text-red-500 data-[state=off]:focus:text-red-500 dark:data-[state=off]:text-red-900 dark:data-[state=off]:hover:text-red-900 dark:data-[state=off]:focus:text-red-900",
  "data-[state=off]:focus-visible:ring-slate-950/12 data-[state=off]:focus-visible:border-slate-950 dark:data-[state=off]:focus-visible:ring-slate-50/12 dark:data-[state=off]:focus-visible:border-slate-300",
  "dark:data-[state=off]:[&_~_button]:bg-slate-100 dark:data-[state=off]:[&_~_button]:hover:bg-slate-950/10 dark:dark:data-[state=off]:[&_~_button]:bg-slate-800 dark:dark:data-[state=off]:[&_~_button]:hover:bg-slate-50/10",
];

const LK_TOGGLE_VARIANT_2 = [
  "data-[state=off]:bg-slate-100 data-[state=off]:hover:bg-slate-950/10 dark:data-[state=off]:bg-slate-800 dark:data-[state=off]:hover:bg-slate-50/10",
  "data-[state=off]:border-slate-200 data-[state=off]:hover:border-slate-950/12 dark:data-[state=off]:border-slate-800 dark:data-[state=off]:hover:border-slate-50/12",
  "data-[state=off]:focus-visible:border-slate-950 data-[state=off]:focus-visible:ring-slate-950/12 dark:data-[state=off]:focus-visible:border-slate-300 dark:data-[state=off]:focus-visible:ring-slate-50/12",
  "data-[state=off]:text-slate-950 data-[state=off]:hover:text-slate-950 data-[state=off]:focus:text-slate-950 dark:data-[state=off]:text-slate-50 dark:data-[state=off]:hover:text-slate-50 dark:data-[state=off]:focus:text-slate-50",
  "data-[state=on]:bg-blue-500/20 data-[state=on]:hover:bg-blue-500/30",
  "data-[state=on]:border-blue-700/10 data-[state=on]:text-blue-700 data-[state=on]:ring-blue-700/30",
  "data-[state=on]:focus-visible:border-blue-700/50",
  "dark:data-[state=on]:bg-blue-500/20 dark:data-[state=on]:text-blue-300",
];

const MOTION_PROPS: MotionProps = {
  variants: {
    hidden: {
      height: 0,
      opacity: 0,
      marginBottom: 0,
    },
    visible: {
      height: "auto",
      opacity: 1,
      marginBottom: 12,
    },
  },
  initial: "hidden",
  transition: {
    duration: 0.3,
    ease: "easeOut",
  },
};

interface AgentChatInputProps {
  chatOpen: boolean;
  onSend?: (message: string) => void | Promise<void>;
  className?: string;
}

function AgentChatInput({ chatOpen, onSend = async () => {}, className }: AgentChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState("");
  const isDisabled = isSending || message.trim().length === 0;

  const handleSend = async () => {
    if (isDisabled) {
      return;
    }

    try {
      setIsSending(true);
      await onSend(message.trim());
      setMessage("");
    } catch (error) {
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  useEffect(() => {
    if (chatOpen) {
      inputRef.current?.focus();
    }
  }, [chatOpen]);

  return (
    <div className={cn("mb-3 flex grow items-end gap-2 rounded-md pl-1 text-sm", className)}>
      <textarea
        autoFocus
        ref={inputRef}
        value={message}
        disabled={!chatOpen || isSending}
        placeholder="Type something..."
        onKeyDown={handleKeyDown}
        onChange={(event) => setMessage(event.target.value)}
        className="field-sizing-content max-h-16 min-h-8 flex-1 resize-none py-2 [scrollbar-width:thin] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      />
      <Button
        size="icon"
        type="button"
        disabled={isDisabled}
        variant={isDisabled ? "secondary" : "default"}
        title={isSending ? "Sending..." : "Send"}
        onClick={() => void handleSend()}
        className="self-end disabled:cursor-not-allowed"
      >
        {isSending ? <Loader className="animate-spin" /> : <SendHorizontal />}
      </Button>
    </div>
  );
}

export interface AgentControlBarControls {
  leave?: boolean;
  camera?: boolean;
  microphone?: boolean;
  screenShare?: boolean;
  chat?: boolean;
}

export interface AgentControlBarProps extends UseInputControlsProps {
  variant?: "default" | "outline" | "livekit";
  controls?: AgentControlBarControls;
  saveUserChoices?: boolean;
  isConnected?: boolean;
  isChatOpen?: boolean;
  onDisconnect?: () => void;
  onIsChatOpenChange?: (open: boolean) => void;
  onDeviceError?: (error: { source: Track.Source; error: Error }) => void;
}

export function AgentControlBar({
  variant = "default",
  controls,
  isChatOpen = false,
  isConnected = false,
  saveUserChoices = true,
  onDisconnect,
  onDeviceError,
  onIsChatOpenChange,
  className,
  ...props
}: AgentControlBarProps & ComponentProps<"div">) {
  const { send } = useChat();
  const publishPermissions = usePublishPermissions();
  const [isChatOpenUncontrolled, setIsChatOpenUncontrolled] = useState(isChatOpen);
  const {
    microphoneTrack,
    cameraToggle,
    microphoneToggle,
    screenShareToggle,
    handleAudioDeviceChange,
    handleVideoDeviceChange,
    handleMicrophoneDeviceSelectError,
    handleCameraDeviceSelectError,
  } = useInputControls({ onDeviceError, saveUserChoices });

  const visibleControls = {
    leave: controls?.leave ?? true,
    microphone: controls?.microphone ?? publishPermissions.microphone,
    screenShare: controls?.screenShare ?? publishPermissions.screenShare,
    camera: controls?.camera ?? publishPermissions.camera,
    chat: controls?.chat ?? publishPermissions.data,
  };

  const isEmpty = Object.values(visibleControls).every((value) => !value);

  if (isEmpty) {
    console.warn("AgentControlBar: `visibleControls` contains only false values.");
    return null;
  }

  return (
    <div
      aria-label="Voice assistant controls"
      className={cn(
        "bg-white border-slate-200/50 dark:border-slate-100 flex flex-col border border-slate-200 p-3 drop-shadow-md/3 dark:bg-slate-950 dark:border-slate-800/50 dark:dark:border-slate-800",
        variant === "livekit" ? "rounded-[31px]" : "rounded-lg",
        className,
      )}
      {...props}
    >
      <motion.div
        {...MOTION_PROPS}
        inert={!(isChatOpen || isChatOpenUncontrolled)}
        animate={isChatOpen || isChatOpenUncontrolled ? "visible" : "hidden"}
        className="border-slate-200/50 flex w-full items-start overflow-hidden border-b dark:border-slate-800/50"
      >
        <AgentChatInput
          chatOpen={isChatOpen || isChatOpenUncontrolled}
          onSend={async (message) => {
            await send(message);
          }}
          className={cn(variant === "livekit" && "[&_button]:rounded-full")}
        />
      </motion.div>

      <div className="flex gap-1">
        <div className="flex grow gap-1">
          {visibleControls.microphone ? (
            <AgentTrackControl
              variant={variant === "outline" ? "outline" : "default"}
              kind="audioinput"
              aria-label="Toggle microphone"
              source={Track.Source.Microphone}
              pressed={microphoneToggle.enabled}
              disabled={microphoneToggle.pending}
              audioTrack={microphoneTrack}
              onPressedChange={microphoneToggle.toggle}
              onActiveDeviceChange={handleAudioDeviceChange}
              onMediaDeviceError={handleMicrophoneDeviceSelectError}
              className={cn(
                variant === "livekit" && [
                  LK_TOGGLE_VARIANT_1,
                  "rounded-full [&_button:first-child]:rounded-l-full [&_button:last-child]:rounded-r-full",
                ],
              )}
            />
          ) : null}

          {visibleControls.camera ? (
            <AgentTrackControl
              variant={variant === "outline" ? "outline" : "default"}
              kind="videoinput"
              aria-label="Toggle camera"
              source={Track.Source.Camera}
              pressed={cameraToggle.enabled}
              pending={cameraToggle.pending}
              disabled={cameraToggle.pending}
              onPressedChange={cameraToggle.toggle}
              onMediaDeviceError={handleCameraDeviceSelectError}
              onActiveDeviceChange={handleVideoDeviceChange}
              className={cn(
                variant === "livekit" && [
                  LK_TOGGLE_VARIANT_1,
                  "rounded-full [&_button:first-child]:rounded-l-full [&_button:last-child]:rounded-r-full",
                ],
              )}
            />
          ) : null}

          {visibleControls.screenShare ? (
            <AgentTrackToggle
              variant={variant === "outline" ? "outline" : "default"}
              aria-label="Toggle screen share"
              source={Track.Source.ScreenShare}
              pressed={screenShareToggle.enabled}
              disabled={screenShareToggle.pending}
              onPressedChange={screenShareToggle.toggle}
              className={cn(variant === "livekit" && [LK_TOGGLE_VARIANT_2, "rounded-full"])}
            />
          ) : null}

          {visibleControls.chat ? (
            <Toggle
              variant={variant === "outline" ? "outline" : "default"}
              pressed={isChatOpen || isChatOpenUncontrolled}
              aria-label="Toggle transcript"
              onPressedChange={(state) => {
                if (!onIsChatOpenChange) {
                  setIsChatOpenUncontrolled(state);
                } else {
                  onIsChatOpenChange(state);
                }
              }}
              className={agentTrackToggleVariants({
                variant: variant === "outline" ? "outline" : "default",
                className: cn(variant === "livekit" && [LK_TOGGLE_VARIANT_2, "rounded-full"]),
              })}
            >
              <MessageSquareTextIcon />
            </Toggle>
          ) : null}
        </div>

        {visibleControls.leave ? (
          <AgentDisconnectButton
            onClick={onDisconnect}
            disabled={!isConnected}
            className={cn(
              variant === "livekit" &&
                "bg-red-500/10 dark:bg-red-500/10 text-red-500 hover:bg-red-500/20 dark:hover:bg-red-500/20 focus:bg-red-500/20 focus-visible:ring-red-500/20 dark:focus-visible:ring-red-500/4 rounded-full font-mono text-xs font-bold tracking-wider dark:bg-red-900/10 dark:dark:bg-red-900/10 dark:text-red-900 dark:hover:bg-red-900/20 dark:dark:hover:bg-red-900/20 dark:focus:bg-red-900/20 dark:focus-visible:ring-red-900/20 dark:dark:focus-visible:ring-red-900/4",
            )}
          >
            <span className="hidden md:inline">END CALL</span>
            <span className="inline md:hidden">END</span>
          </AgentDisconnectButton>
        ) : null}
      </div>
    </div>
  );
}
