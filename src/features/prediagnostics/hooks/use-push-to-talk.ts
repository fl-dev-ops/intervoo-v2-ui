import { useCallback, useEffect, useRef, useState } from "react";
import {
  useAgent,
  useLocalParticipant,
  useRemoteParticipants,
  useRoomContext,
  useSessionContext,
} from "@livekit/components-react";
import { ParticipantKind, RpcError } from "livekit-client";

export type PrediagnosticsPttState = "idle" | "recording" | "processing" | "agent_speaking";

export function usePrediagnosticsPushToTalk() {
  const room = useRoomContext();
  const { session } = useSessionContext();
  const agent = useAgent(session);
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();

  const [state, setState] = useState<PrediagnosticsPttState>("idle");
  const [error, setError] = useState<string | null>(null);
  const previousStateRef = useRef<PrediagnosticsPttState>("idle");

  const agentParticipant = remoteParticipants.find(
    (participant) => participant.kind === ParticipantKind.AGENT,
  );

  const updateState = useCallback((nextState: PrediagnosticsPttState) => {
    if (previousStateRef.current === nextState) {
      return;
    }

    previousStateRef.current = nextState;
    setState(nextState);
  }, []);

  useEffect(() => {
    if (agent.state === "speaking") {
      updateState("agent_speaking");
      return;
    }

    if (
      previousStateRef.current === "agent_speaking" ||
      previousStateRef.current === "processing"
    ) {
      const timer = window.setTimeout(() => {
        updateState("idle");
      }, 400);

      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [agent.state, updateState]);

  const startTurn = useCallback(async () => {
    if (!agentParticipant || !localParticipant || state !== "idle") {
      if (!agentParticipant) {
        setError("Agent not connected");
      }
      return;
    }

    try {
      setError(null);
      await localParticipant.setMicrophoneEnabled(true);
      updateState("recording");

      try {
        await room.localParticipant?.performRpc({
          destinationIdentity: agentParticipant.identity,
          method: "start_turn",
          payload: "",
          responseTimeout: 30000,
        });
      } catch (rpcError) {
        if (rpcError instanceof RpcError) {
          console.warn("start_turn RPC not implemented:", rpcError.message);
        } else {
          throw rpcError;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start turn";
      setError(message);
      updateState("idle");
      await localParticipant.setMicrophoneEnabled(false);
    }
  }, [agentParticipant, localParticipant, room, state, updateState]);

  const endTurn = useCallback(async () => {
    if (!agentParticipant || !localParticipant || state !== "recording") {
      return;
    }

    try {
      setError(null);
      await localParticipant.setMicrophoneEnabled(false);
      updateState("processing");

      try {
        await room.localParticipant?.performRpc({
          destinationIdentity: agentParticipant.identity,
          method: "end_turn",
          payload: "",
          responseTimeout: 30000,
        });
      } catch (rpcError) {
        if (rpcError instanceof RpcError) {
          console.warn("end_turn RPC not implemented:", rpcError.message);
        } else {
          throw rpcError;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to end turn";
      setError(message);
      updateState("idle");
    }
  }, [agentParticipant, localParticipant, room, state, updateState]);

  return {
    state,
    error,
    isAvailable: !!agentParticipant && agent.canListen,
    isRecording: state === "recording",
    isProcessing: state === "processing",
    isAgentSpeaking: state === "agent_speaking",
    startTurn,
    endTurn,
  };
}
