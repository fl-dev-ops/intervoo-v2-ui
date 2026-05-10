"use client";

import { Mic } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: Date;
};

export type ChatStatus = "idle" | "recording" | "processing" | "speaking";

export type PushToTalkMode = "hold" | "toggle";

export function usePushToTalk(options: {
  onToggle?: (isActive: boolean) => void;
}) {
  const [isActive, setIsActive] = useState(false);

  const handleClick = useCallback(() => {
    setIsActive((prev) => {
      const next = !prev;
      options.onToggle?.(next);
      return next;
    });
  }, [options]);

  return {
    isActive,
    handleClick,
  };
}

export function ChatMessageBubble({
  message,
  isLast,
}: {
  message: ChatMessage;
  isLast?: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start",
        isLast && "animate-in fade-in slide-in-from-bottom-2 duration-300",
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-transparent text-foreground",
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex w-full justify-start">
      <div className="flex max-w-[85%] items-center gap-1 rounded-2xl bg-transparent px-4 py-3">
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
      </div>
    </div>
  );
}

export function WaveformVisualizer({
  isActive,
  audioLevel,
  barCount = 40,
  scrolling = false,
}: {
  isActive: boolean;
  audioLevel?: number;
  barCount?: number;
  scrolling?: boolean;
}) {
  const bars = Array.from({ length: barCount }, (_, i) => i);
  const mid = (barCount - 1) / 2;

  const content = bars.map((bar) => {
    // When audioLevel is provided, create a bell-curve distribution
    // where center bars are tallest and edges are shortest, scaled by volume.
    let height: string;
    if (typeof audioLevel === "number") {
      const distance = Math.abs(bar - mid) / mid; // 0 at center, 1 at edges
      const curve = 1 - distance * distance; // parabolic falloff
      const level = Math.max(0, Math.min(100, audioLevel));
      height = `${Math.max(8, curve * level)}%`;
    } else {
      height = isActive ? `${Math.random() * 100}%` : "20%";
    }

    return (
      <div
        key={bar}
        className={cn(
          "w-[3px] shrink-0 rounded-full transition-all duration-150",
          isActive
            ? "animate-waveform bg-foreground"
            : "bg-muted-foreground/30",
        )}
        style={{
          height,
          animationDelay:
            isActive && typeof audioLevel !== "number"
              ? `${bar * 30}ms`
              : "0ms",
        }}
      />
    );
  });

  if (scrolling) {
    return (
      <div className="relative flex h-full w-full items-center overflow-hidden">
        <div className="flex h-full w-max items-center gap-[3px] animate-marquee">
          {content}
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center gap-[2px]">
      {content}
    </div>
  );
}

export function PushToTalkButton({
  isActive,
  status,
  onClick,
}: {
  isActive: boolean;
  status: ChatStatus;
  onClick?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <WaveformVisualizer isActive={isActive} />
      <button
        className={cn(
          "relative flex size-16 items-center justify-center rounded-full border-2 transition-all duration-200",
          isActive
            ? "scale-95 border-foreground bg-foreground text-background shadow-lg shadow-foreground/25"
            : "border-border bg-background text-foreground hover:border-foreground/50 hover:bg-muted",
        )}
        onClick={onClick}
        type="button"
      >
        <Mic className="size-6" />
        {isActive && (
          <span className="absolute inset-0 rounded-full animate-ping border-2 border-foreground opacity-20" />
        )}
      </button>
      <span className="text-xs text-muted-foreground">
        {status === "recording"
          ? "Recording..."
          : status === "processing"
            ? "Processing..."
            : status === "speaking"
              ? "Agent speaking..."
              : "Tap to talk"}
      </span>
    </div>
  );
}

export function ChatContainer({
  messages,
  status,
  children,
}: {
  messages: ChatMessage[];
  status: ChatStatus;
  children: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  });

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      >
        {messages.map((message, index) => (
          <ChatMessageBubble
            key={message.id}
            message={message}
            isLast={index === messages.length - 1}
          />
        ))}
        {status === "processing" && <TypingIndicator />}
      </div>
      <div className="border-t bg-background/80 px-4 py-4 backdrop-blur-sm">
        {children}
      </div>
    </div>
  );
}
