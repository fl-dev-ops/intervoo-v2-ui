"use client";

import { useCallback, useState } from "react";
import { ChatInput } from "@/components/prediagnostics/chat-input";
import type {
  ChatMessage,
  ChatStatus,
} from "@/components/prediagnostics/chat-ui";
import { ChatContainer } from "@/components/prediagnostics/chat-ui";

const mockAgentMessages = [
  "Hi there! I'm here to help you discover the right career path. Let's start with what you're looking for.",
  "What kind of job roles are you interested in? For example, software engineering, data science, product management?",
  "Great choice! What specific area within software engineering? Frontend, backend, full-stack, or mobile?",
  "Thanks for sharing! What's your current educational background?",
  "Perfect! Based on what you've shared, I think you'd be a great fit for several roles. Let me prepare your diagnostic interview.",
];

export function PrediagnosticsChat({
  onComplete,
}: {
  onComplete?: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "agent",
      content: mockAgentMessages[0],
      timestamp: new Date(),
    },
  ]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [isRecording, setIsRecording] = useState(false);
  const [_currentAgentIndex, setCurrentAgentIndex] = useState(0);

  const addMessage = useCallback((role: "user" | "agent", content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role,
        content,
        timestamp: new Date(),
      },
    ]);
  }, []);

  const simulateAgentResponse = useCallback(() => {
    setStatus("processing");

    setTimeout(() => {
      setCurrentAgentIndex((prev) => {
        const nextIndex = prev + 1;
        if (nextIndex < mockAgentMessages.length) {
          addMessage("agent", mockAgentMessages[nextIndex]);
        } else if (nextIndex === mockAgentMessages.length) {
          // All questions asked, complete the session
          setTimeout(() => {
            onComplete?.();
          }, 2000);
        }
        return nextIndex;
      });
      setStatus("speaking");

      setTimeout(() => {
        setStatus("idle");
      }, 2000);
    }, 1500);
  }, [addMessage, onComplete]);

  const handleSend = useCallback(
    (value: { text: string; mode: "text" | "voice" }) => {
      addMessage("user", value.text);
      setStatus("processing");

      setTimeout(() => {
        simulateAgentResponse();
      }, 500);
    },
    [addMessage, simulateAgentResponse],
  );

  const handleToggleVoice = useCallback(() => {
    setIsRecording((prev) => {
      const next = !prev;
      if (next) {
        setStatus("recording");
      } else {
        setStatus("processing");
        addMessage(
          "user",
          "I'm interested in software engineering roles, particularly full-stack development. I have a degree in Computer Science.",
        );
        setTimeout(() => {
          simulateAgentResponse();
        }, 500);
      }
      return next;
    });
  }, [addMessage, simulateAgentResponse]);

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="mx-auto flex h-full w-full max-w-2xl flex-col">
        <ChatContainer messages={messages} status={status}>
          <ChatInput
            disabled={status === "processing"}
            isRecording={isRecording}
            placeholder="Type a message or tap mic to speak..."
            onSend={handleSend}
            onToggleVoice={handleToggleVoice}
          />
        </ChatContainer>
      </div>
    </div>
  );
}
