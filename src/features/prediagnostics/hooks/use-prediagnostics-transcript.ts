import { useCallback, useEffect, useRef } from "react";
import {
  buildPrediagnosticsSessionTranscript,
  type PrediagnosticsSessionTranscript,
  type PrediagnosticsTranscriptMessage,
} from "#/lib/prediagnostics/transcript";
import type { PrediagnosticsMessage } from "#/features/prediagnostics/hooks/use-prediagnostics-messages";

function toTranscriptMessage(message: PrediagnosticsMessage): PrediagnosticsTranscriptMessage {
  return {
    id: message.id,
    role: message.role,
    text: message.text,
    timestamp: new Date(message.timestamp).toISOString(),
  };
}

export function usePrediagnosticsTranscript(messages: PrediagnosticsMessage[]) {
  const transcriptRef = useRef<PrediagnosticsSessionTranscript>(
    buildPrediagnosticsSessionTranscript([]),
  );
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (messages.length >= prevCountRef.current) {
      prevCountRef.current = messages.length;
      transcriptRef.current = buildPrediagnosticsSessionTranscript(
        messages.map(toTranscriptMessage),
      );
    }
  }, [messages]);

  const getTranscript = useCallback(() => transcriptRef.current, []);

  return { transcriptRef, getTranscript };
}
