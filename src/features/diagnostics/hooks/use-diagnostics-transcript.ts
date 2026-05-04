import { useCallback, useEffect, useRef } from "react";
import {
  buildDiagnosticsSessionTranscript,
  type DiagnosticsSessionTranscript,
  type DiagnosticsTranscriptMessage,
} from "#/lib/diagnostics/transcript";
import type { DiagnosticsMessage } from "#/features/diagnostics/hooks/use-diagnostics-messages";

function toTranscriptMessage(message: DiagnosticsMessage): DiagnosticsTranscriptMessage {
  return {
    id: message.id,
    role: message.role,
    text: message.text,
    timestamp: new Date(message.timestamp).toISOString(),
  };
}

export function useDiagnosticsTranscript(messages: DiagnosticsMessage[]) {
  const transcriptRef = useRef<DiagnosticsSessionTranscript>(buildDiagnosticsSessionTranscript([]));
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (messages.length >= prevCountRef.current) {
      prevCountRef.current = messages.length;
      transcriptRef.current = buildDiagnosticsSessionTranscript(messages.map(toTranscriptMessage));
    }
  }, [messages]);

  const getTranscript = useCallback(() => transcriptRef.current, []);

  return { transcriptRef, getTranscript };
}
