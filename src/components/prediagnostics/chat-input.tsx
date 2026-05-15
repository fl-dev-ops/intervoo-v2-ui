"use client";

import { Mic, Square, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const waveformBars = Array.from({ length: 20 }, (_, i) => ({
  id: `waveform-${i}`,
  height: Math.random() * 100,
  delay: i * 50,
}));

export type ChatInputMode = "text" | "voice";

export type ChatInputValue = {
  text: string;
  mode: ChatInputMode;
};

export function ChatInput({
  onSend,
  onToggleVoice,
  isRecording,
  disabled,
  placeholder = "Type a message...",
}: {
  onSend: (value: ChatInputValue) => void;
  onToggleVoice: () => void;
  isRecording: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState("");

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (text.trim() && !disabled) {
        onSend({ text: text.trim(), mode: "text" });
        setText("");
      }
    },
    [text, disabled, onSend],
  );

  return (
    <form
      className="flex items-center gap-2 rounded-2xl border bg-transparent px-3 py-2 shadow-sm"
      onSubmit={handleSubmit}
    >
      <Input
        className="flex-1 border-0 bg-transparent! px-2 py-2 shadow-none focus-visible:ring-0"
        disabled={disabled || isRecording}
        placeholder={isRecording ? "Listening..." : placeholder}
        type="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />

      {isRecording && (
        <div className="flex items-center gap-1">
          <div className="flex h-8 items-center gap-[2px]">
            {waveformBars.map((bar) => (
              <div
                key={bar.id}
                className="w-[2px] animate-waveform rounded-full bg-foreground"
                style={{
                  height: `${bar.height}%`,
                  animationDelay: `${bar.delay}ms`,
                }}
              />
            ))}
          </div>
          <Button
            className="size-8 shrink-0"
            size="icon"
            type="button"
            variant="ghost"
            onClick={onToggleVoice}
          >
            <X className="size-4" />
          </Button>
        </div>
      )}

      <Button
        className={cn(
          "size-8 shrink-0 transition-all",
          isRecording && "bg-foreground text-background",
        )}
        disabled={disabled}
        size="icon"
        type="button"
        variant={isRecording ? "default" : "ghost"}
        onClick={onToggleVoice}
      >
        {isRecording ? (
          <Square className="size-3 fill-current" />
        ) : (
          <Mic className="size-4" />
        )}
      </Button>
    </form>
  );
}
