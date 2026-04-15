import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useAgent,
  usePersistentUserChoices,
  useSessionContext,
  type UseSessionReturn,
} from "@livekit/components-react";

import type { PrediagnosticsConnectionDetails } from "#/lib/livekit/prediagnostics";
import type { PrediagnosticsSessionTranscript } from "#/lib/prediagnostics/transcript";
import {
  type PrediagnosticsMessage,
  usePrediagnosticsMessages,
} from "#/features/prediagnostics/hooks/use-prediagnostics-messages";
import { usePrediagnosticsPushToTalk } from "#/features/prediagnostics/hooks/use-push-to-talk";
import { usePrediagnosticsTranscript } from "#/features/prediagnostics/hooks/use-prediagnostics-transcript";

type UsePrediagnosticsSessionAdapterProps = {
  connectionDetails: PrediagnosticsConnectionDetails;
  session: UseSessionReturn;
  sessionId: string;
  onFinished: (payload: { sessionId: string }) => void;
};

type PrediagnosticsSessionAdapter = {
  agentState: string | undefined;
  agentIsSpeaking: boolean;
  agentIsThinking: boolean;
  agentCanListen: boolean;
  agentIsFinished: boolean;
  displayMessages: PrediagnosticsMessage[];
  endError: string | null;
  getTranscript: () => PrediagnosticsSessionTranscript;
  requestDisconnect: () => Promise<void>;
  hasAgentGreeted: boolean;
  isConnected: boolean;
  isEnding: boolean;
  sessionHasStarted: boolean;
  userCanSpeak: boolean;
  ptt: ReturnType<typeof usePrediagnosticsPushToTalk>;
  showAgentPendingBubble: boolean;
  showUserPendingBubble: boolean;
  userChoices: ReturnType<typeof usePersistentUserChoices>["userChoices"];
};

export function usePrediagnosticsSessionAdapter(
  props: UsePrediagnosticsSessionAdapterProps,
): PrediagnosticsSessionAdapter {
  const { end, isConnected, start } = useSessionContext();
  const agent = useAgent(props.session);
  const messages = usePrediagnosticsMessages(props.session);
  const { getTranscript } = usePrediagnosticsTranscript(messages);
  const ptt = usePrediagnosticsPushToTalk();
  const { userChoices } = usePersistentUserChoices({ preventSave: true });
  const [hasStartBeenRequested, setHasStartBeenRequested] = useState(false);
  const [sessionHasStarted, setSessionHasStarted] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);
  const [committedUserVoiceMessages, setCommittedUserVoiceMessages] = useState<
    PrediagnosticsMessage[]
  >([]);
  const previousPttStateRef = useRef(ptt.state);
  const activeTurnStartIndexRef = useRef<number | null>(null);
  const isEndingRef = useRef(false);
  const hasCompletedSessionRef = useRef(false);

  const hasAgentGreeted = messages.some((message) => message.role === "agent");
  const agentIsThinking = agent.state === "thinking";
  const agentIsSpeaking = agent.state === "speaking";
  const agentCanListen = agent.canListen;
  const agentIsFinished = agent.isFinished;
  const userCanSpeak = agentCanListen && !agentIsThinking && !isEnding;

  const userVoiceTranscriptMessages = useMemo(
    () =>
      messages.filter(
        (message: PrediagnosticsMessage) =>
          message.role === "user" && message.kind === "transcript",
      ),
    [messages],
  );

  const activeTurnMessage = useMemo(() => {
    if (
      props.connectionDetails.interactionMode !== "ptt" ||
      activeTurnStartIndexRef.current === null ||
      !ptt.isProcessing
    ) {
      return null;
    }

    const turnMessages = userVoiceTranscriptMessages.slice(activeTurnStartIndexRef.current);
    const combinedText = turnMessages
      .map((message: PrediagnosticsMessage) => message.text.trim())
      .filter(Boolean)
      .join(" ")
      .trim();

    if (!combinedText) {
      return null;
    }

    return {
      id: `active-user-voice-turn-${turnMessages[turnMessages.length - 1]?.timestamp ?? Date.now()}`,
      role: "user" as const,
      kind: "transcript" as const,
      text: combinedText,
      timestamp: turnMessages[turnMessages.length - 1]?.timestamp ?? Date.now(),
    };
  }, [props.connectionDetails.interactionMode, ptt.isProcessing, userVoiceTranscriptMessages]);

  const displayMessages = useMemo(() => {
    if (props.connectionDetails.interactionMode !== "ptt") {
      return messages;
    }

    const visibleMessages = messages.filter(
      (message: PrediagnosticsMessage) =>
        !(message.role === "user" && message.kind === "transcript"),
    );

    return [
      ...visibleMessages,
      ...committedUserVoiceMessages,
      ...(activeTurnMessage ? [activeTurnMessage] : []),
    ].toSorted(
      (left: PrediagnosticsMessage, right: PrediagnosticsMessage) =>
        left.timestamp - right.timestamp,
    );
  }, [
    activeTurnMessage,
    committedUserVoiceMessages,
    messages,
    props.connectionDetails.interactionMode,
  ]);

  const showUserPendingBubble =
    props.connectionDetails.interactionMode === "ptt" && ptt.isRecording;
  const showAgentPendingBubble =
    props.connectionDetails.interactionMode === "ptt" && agentIsThinking;

  useEffect(() => {
    if (hasStartBeenRequested || isConnected) {
      return;
    }

    setHasStartBeenRequested(true);
    void start({
      tracks: {
        microphone: {
          enabled: props.connectionDetails.interactionMode === "auto",
        },
      },
    });
  }, [hasStartBeenRequested, isConnected, props.connectionDetails.interactionMode, start]);

  useEffect(() => {
    if (sessionHasStarted || !isConnected) {
      return;
    }

    setSessionHasStarted(true);
  }, [isConnected, sessionHasStarted]);

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const preferredAudioDeviceId = userChoices.audioDeviceId;

    if (!preferredAudioDeviceId || preferredAudioDeviceId === "default") {
      return;
    }

    if (props.session.room.getActiveDevice("audioinput") === preferredAudioDeviceId) {
      return;
    }

    props.session.room.switchActiveDevice("audioinput", preferredAudioDeviceId, true).catch(() => {
      void props.session.room
        .switchActiveDevice("audioinput", preferredAudioDeviceId, false)
        .catch(() => {});
    });
  }, [isConnected, props.session.room, userChoices.audioDeviceId]);

  useEffect(() => {
    if (props.connectionDetails.interactionMode !== "ptt") {
      previousPttStateRef.current = ptt.state;
      activeTurnStartIndexRef.current = null;
      return;
    }

    const previousState = previousPttStateRef.current;

    if (ptt.state === "recording" && previousState !== "recording") {
      activeTurnStartIndexRef.current = userVoiceTranscriptMessages.length;
    }

    const shouldCommitTurn =
      activeTurnStartIndexRef.current !== null &&
      previousState === "processing" &&
      ptt.state !== "processing";

    if (shouldCommitTurn) {
      const startIndex = activeTurnStartIndexRef.current ?? undefined;
      const turnMessages = userVoiceTranscriptMessages.slice(startIndex);
      const combinedText = turnMessages
        .map((message: PrediagnosticsMessage) => message.text.trim())
        .filter(Boolean)
        .join(" ")
        .trim();

      if (combinedText) {
        const lastTurnTimestamp = turnMessages[turnMessages.length - 1]?.timestamp ?? Date.now();

        setCommittedUserVoiceMessages((current) => [
          ...current,
          {
            id: `user-voice-turn-${lastTurnTimestamp}-${current.length}`,
            role: "user",
            kind: "transcript",
            text: combinedText,
            timestamp: lastTurnTimestamp,
          },
        ]);
      }

      activeTurnStartIndexRef.current = null;
    }

    previousPttStateRef.current = ptt.state;
  }, [props.connectionDetails.interactionMode, ptt.state, userVoiceTranscriptMessages]);

  const finalizeAndEndSession = useCallback(
    async (preCapturedTranscript?: PrediagnosticsSessionTranscript) => {
      if (isEndingRef.current || hasCompletedSessionRef.current) {
        return;
      }

      isEndingRef.current = true;
      setIsEnding(true);
      setEndError(null);

      try {
        const transcript = preCapturedTranscript ?? getTranscript();

        const response = await fetch("/api/prediagnostics/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId: props.sessionId,
            transcript,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const message =
            payload &&
            typeof payload === "object" &&
            "error" in payload &&
            typeof payload.error === "string"
              ? payload.error
              : "Failed to finalize pre-diagnostic session";
          throw new Error(message);
        }

        await end();
        hasCompletedSessionRef.current = true;
        props.onFinished({ sessionId: props.sessionId });
      } catch (error) {
        setEndError(
          error instanceof Error ? error.message : "Failed to finalize pre-diagnostic session",
        );
      } finally {
        isEndingRef.current = false;
        setIsEnding(false);
      }
    },
    [end, getTranscript, props],
  );

  useEffect(() => {
    if (sessionHasStarted && agentIsFinished) {
      void finalizeAndEndSession(getTranscript());
    }
  }, [agentIsFinished, finalizeAndEndSession, getTranscript, sessionHasStarted]);

  const requestDisconnect = useCallback(async () => {
    await finalizeAndEndSession(getTranscript());
  }, [finalizeAndEndSession, getTranscript]);

  return {
    agentState: agent.state,
    agentIsSpeaking,
    agentIsThinking,
    agentCanListen,
    agentIsFinished,
    displayMessages,
    endError,
    getTranscript,
    requestDisconnect,
    hasAgentGreeted,
    isConnected,
    isEnding,
    sessionHasStarted,
    userCanSpeak,
    ptt,
    showAgentPendingBubble,
    showUserPendingBubble,
    userChoices,
  };
}
