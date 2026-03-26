import { useEffect, useRef } from "react";
import type { PreScreenTranscriptMessage } from "../utils/transcript";

interface PreScreenChatMessageListProps {
  messages: PreScreenTranscriptMessage[];
  isWaitingForAgent: boolean;
}

export function PreScreenChatMessageList({
  messages,
  isWaitingForAgent,
}: PreScreenChatMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isWaitingForAgent]);

  return (
    <div
      ref={containerRef}
      className="flex min-h-[420px] flex-1 flex-col gap-4 overflow-y-auto rounded-[28px] border border-slate-200 bg-slate-50/80 p-4"
    >
      {messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
            Waiting for the pre-screen to begin...
          </div>
        </div>
      ) : (
        messages.map((message) => {
          const isUser = message.role === "user";

          return (
            <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${
                  isUser
                    ? "rounded-br-md bg-slate-950 text-white"
                    : "rounded-bl-md border border-slate-200 bg-white text-slate-700"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-70">
                  {isUser ? "You" : "Interviewer"}
                </p>
                <p className="mt-2 whitespace-pre-wrap">{message.text}</p>
              </div>
            </div>
          );
        })
      )}

      {isWaitingForAgent ? (
        <div className="flex justify-start">
          <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
            The interviewer is thinking...
          </div>
        </div>
      ) : null}
    </div>
  );
}
