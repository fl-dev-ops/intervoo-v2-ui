import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useLocalParticipant,
  useRemoteParticipants,
  useVoiceAssistant,
} from "@livekit/components-react";
import { ParticipantKind } from "livekit-client";

export type PushToTalkState = "idle" | "recording" | "processing" | "agent_speaking";

export interface PushToTalkController {
  pttState: PushToTalkState;
  isRecording: boolean;
  canRecord: boolean;
  isAgentReady: boolean;
  error: string | null;
  toggleRecording: () => Promise<void>;
  cancelRecording: () => Promise<void>;
}

export function getControlBarLabel(state: PushToTalkState, isAgentReady: boolean) {
  if (!isAgentReady) {
    return "Connecting to Sana...";
  }

  if (state === "recording") {
    return "Listening...";
  }

  if (state === "processing") {
    return "Sending your answer...";
  }

  if (state === "agent_speaking") {
    return "Sana is speaking...";
  }

  return "Tap mic to respond";
}

export function getPushToTalkButtonLabel(state: PushToTalkState, isAgentReady: boolean) {
  if (!isAgentReady) {
    return "Connecting";
  }

  if (state === "recording") {
    return "Stop";
  }

  if (state === "processing") {
    return "Sending";
  }

  if (state === "agent_speaking") {
    return "Wait";
  }

  return "Speak";
}

export function usePushToTalk(options?: {
  reEnableDelayMs?: number;
  onError?: (error: string) => void;
}): PushToTalkController {
  const reEnableDelayMs = options?.reEnableDelayMs ?? 400;
  const onError = options?.onError;

  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const { state: agentState } = useVoiceAssistant();

  const [pttState, setPttState] = useState<PushToTalkState>("idle");
  const [error, setError] = useState<string | null>(null);

  const agentParticipant = useMemo(
    () =>
      remoteParticipants.find((participant) => participant.kind === ParticipantKind.AGENT) ?? null,
    [remoteParticipants],
  );

  useEffect(() => {
    if (agentState === "speaking") {
      setPttState("agent_speaking");
      return;
    }

    if (pttState === "agent_speaking" || pttState === "processing") {
      const timer = window.setTimeout(() => {
        setPttState("idle");
      }, reEnableDelayMs);

      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [agentState, pttState, reEnableDelayMs]);

  const startRecording = useCallback(async () => {
    if (!localParticipant || !agentParticipant) {
      const message = "Cannot start recording until the session is ready.";
      setError(message);
      onError?.(message);
      return;
    }

    try {
      setError(null);
      setPttState("recording");
      await localParticipant.setMicrophoneEnabled(true);
      localParticipant
        .performRpc({
          destinationIdentity: agentParticipant.identity,
          method: "start_turn",
          payload: "",
        })
        .catch((nextError) => {
          console.warn("[usePushToTalk] start_turn RPC failed (non-blocking):", nextError);
        });
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Failed to start recording.";
      setError(message);
      onError?.(message);
      setPttState("idle");
    }
  }, [agentParticipant, localParticipant, onError]);

  const stopRecording = useCallback(async () => {
    if (!localParticipant || !agentParticipant) {
      const message = "Cannot stop recording until the session is ready.";
      setError(message);
      onError?.(message);
      return;
    }

    try {
      setError(null);
      setPttState("processing");
      await localParticipant.setMicrophoneEnabled(false);
      await localParticipant.performRpc({
        destinationIdentity: agentParticipant.identity,
        method: "end_turn",
        payload: "",
      });
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : "Failed to send your answer.";
      setError(message);
      onError?.(message);
      setPttState("idle");
    }
  }, [agentParticipant, localParticipant, onError]);

  const cancelRecording = useCallback(async () => {
    if (!localParticipant || !agentParticipant) {
      setPttState("idle");
      return;
    }

    try {
      setError(null);
      setPttState("idle");
      await localParticipant.setMicrophoneEnabled(false);
      await localParticipant.performRpc({
        destinationIdentity: agentParticipant.identity,
        method: "cancel_turn",
        payload: "",
      });
    } catch {
      setPttState("idle");
    }
  }, [agentParticipant, localParticipant]);

  const toggleRecording = useCallback(async () => {
    if (pttState === "idle") {
      await startRecording();
      return;
    }

    if (pttState === "recording") {
      await stopRecording();
    }
  }, [pttState, startRecording, stopRecording]);

  const isAgentReady = Boolean(localParticipant && agentParticipant);
  const isRecording = pttState === "recording";
  const canRecord = (pttState === "idle" || pttState === "recording") && isAgentReady;

  return {
    pttState,
    isRecording,
    canRecord,
    isAgentReady,
    error,
    toggleRecording,
    cancelRecording,
  };
}
