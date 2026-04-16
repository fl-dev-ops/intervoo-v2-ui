import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  useAgent,
  useConnectionState,
  usePersistentUserChoices,
  useSessionContext,
  type UseSessionReturn,
} from "#/shared/livekit";
import { ConnectionState as LiveKitConnectionState } from "#/shared/livekit";

import type { PrediagnosticsConnectionDetails } from "#/lib/livekit/prediagnostics";
import type { PrediagnosticsSessionTranscript } from "#/lib/prediagnostics/transcript";
import {
  type PrediagnosticsMessage,
  usePrediagnosticsMessages,
} from "#/features/prediagnostics/hooks/use-prediagnostics-messages";
import { usePrediagnosticsPushToTalk } from "#/features/prediagnostics/hooks/use-push-to-talk";
import { usePrediagnosticsTranscript } from "#/features/prediagnostics/hooks/use-prediagnostics-transcript";

export type PrediagnosticsSessionContextValue = {
  connectionDetails: PrediagnosticsConnectionDetails;
  sessionId: string;

  // Session state
  agentState: string | undefined;
  agentIsSpeaking: boolean;
  agentIsThinking: boolean;
  agentCanListen: boolean;
  agentIsFinished: boolean;
  displayMessages: PrediagnosticsMessage[];
  endError: string | null;
  hasAgentGreeted: boolean;
  isConnected: boolean;
  isEnding: boolean;
  isReconnecting: boolean;
  sessionHasStarted: boolean;
  userCanSpeak: boolean;
  showAgentPendingBubble: boolean;
  showUserPendingBubble: boolean;

  // Actions
  onEnd: () => void;
  getTranscript: () => PrediagnosticsSessionTranscript;
  ptt: ReturnType<typeof usePrediagnosticsPushToTalk>;
};

type PrediagnosticsSessionProviderProps = {
  children: ReactNode;
  connectionDetails: PrediagnosticsConnectionDetails;
  initialMessages?: PrediagnosticsMessage[];
  sessionId: string;
  session: UseSessionReturn;
  onFinished: (payload: { sessionId: string }) => void;
};

const PrediagnosticsSessionContext = createContext<PrediagnosticsSessionContextValue | null>(null);

export function usePrediagnosticsSessionContext() {
  const context = useContext(PrediagnosticsSessionContext);
  if (!context) {
    throw new Error(
      "usePrediagnosticsSessionContext must be used within a PrediagnosticsSessionProvider",
    );
  }
  return context;
}

export function PrediagnosticsSessionProvider(props: PrediagnosticsSessionProviderProps) {
  const { end, start } = useSessionContext();
  const connectionState = useConnectionState(props.session.room);
  const isConnected = connectionState === LiveKitConnectionState.Connected;
  const agent = useAgent(props.session);
  const messages = usePrediagnosticsMessages(props.session, props.initialMessages);
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
  const isPageUnloadingRef = useRef(false);
  const lastPersistedTranscriptRef = useRef<string | null>(null);
  const hasAgentBeenActiveInSessionRef = useRef(false);

  useEffect(() => {
    console.log(
      `[agent-debug] connectionState=${connectionState} room.state=${props.session.room.state} agent.state=${agent.state} canListen=${agent.canListen} isFinished=${agent.isFinished} identity=${agent.identity ?? "n/a"}`,
    );
  }, [agent, connectionState, props.session.room.state]);

  const hasAgentGreeted = messages.some(
    (message: PrediagnosticsMessage) => message.role === "agent",
  );
  const agentIsThinking = agent.state === "thinking";
  const agentIsSpeaking = agent.state === "speaking";
  const agentCanListen = agent.canListen;
  const agentIsFinished = agent.isFinished;
  const userCanSpeak = !isEnding;

  if (agentCanListen || agentIsSpeaking) {
    hasAgentBeenActiveInSessionRef.current = true;
  }

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

  const restoredUserVoiceMessages = useMemo(
    () =>
      props.connectionDetails.interactionMode === "ptt"
        ? (props.initialMessages ?? []).filter(
            (message: PrediagnosticsMessage) =>
              message.role === "user" && message.kind === "transcript",
          )
        : [],
    [props.connectionDetails.interactionMode, props.initialMessages],
  );

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
      ...restoredUserVoiceMessages,
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
    restoredUserVoiceMessages,
  ]);

  const { getTranscript } = usePrediagnosticsTranscript(displayMessages);

  const showUserPendingBubble =
    props.connectionDetails.interactionMode === "ptt" && ptt.isRecording;
  const showAgentPendingBubble =
    props.connectionDetails.interactionMode === "ptt" && agentIsThinking;

  useEffect(() => {
    const markPageAsUnloading = () => {
      isPageUnloadingRef.current = true;
    };

    window.addEventListener("beforeunload", markPageAsUnloading);
    window.addEventListener("pagehide", markPageAsUnloading);

    return () => {
      window.removeEventListener("beforeunload", markPageAsUnloading);
      window.removeEventListener("pagehide", markPageAsUnloading);
    };
  }, []);

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

    console.log(`[agent-debug] session started, isConnected=${isConnected}`);
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

  useEffect(() => {
    if (
      !sessionHasStarted ||
      isEnding ||
      isPageUnloadingRef.current ||
      displayMessages.length === 0 ||
      agentIsSpeaking
    ) {
      return;
    }

    const transcript = getTranscript();
    const serializedTranscript = JSON.stringify(transcript.messages);

    if (lastPersistedTranscriptRef.current === serializedTranscript) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void fetch("/api/prediagnostics/transcript", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: props.sessionId,
          transcript,
        }),
      })
        .then((response) => {
          if (response.ok) {
            lastPersistedTranscriptRef.current = serializedTranscript;
          }
        })
        .catch(() => {});
    }, 750);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    agentIsSpeaking,
    displayMessages.length,
    getTranscript,
    isEnding,
    props.sessionId,
    sessionHasStarted,
  ]);

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

          if (response.status === 409) {
            hasCompletedSessionRef.current = true;
          }

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
    if (isPageUnloadingRef.current) {
      return;
    }

    if (sessionHasStarted && hasAgentBeenActiveInSessionRef.current && agentIsFinished) {
      console.log(
        `[agent-debug] auto-finalize firing | sessionHasStarted=${sessionHasStarted} hasAgentActive=${hasAgentBeenActiveInSessionRef.current} agentIsFinished=${agentIsFinished}`,
      );
      void finalizeAndEndSession(getTranscript());
    }
  }, [agentIsFinished, finalizeAndEndSession, getTranscript, sessionHasStarted]);

  const onEnd = useCallback(async () => {
    await finalizeAndEndSession(getTranscript());
  }, [finalizeAndEndSession, getTranscript]);

  const value = useMemo<PrediagnosticsSessionContextValue>(
    () => ({
      connectionDetails: props.connectionDetails,
      sessionId: props.sessionId,
      agentState: agent.state,
      agentIsSpeaking,
      agentIsThinking,
      agentCanListen,
      agentIsFinished,
      displayMessages,
      endError,
      getTranscript,
      hasAgentGreeted,
      isConnected,
      isEnding,
      isReconnecting: connectionState === LiveKitConnectionState.Reconnecting,
      sessionHasStarted,
      userCanSpeak,
      onEnd,
      ptt,
      showAgentPendingBubble,
      showUserPendingBubble,
    }),
    [
      agent.state,
      agentCanListen,
      agentIsFinished,
      agentIsSpeaking,
      agentIsThinking,
      connectionState,
      displayMessages,
      endError,
      getTranscript,
      hasAgentGreeted,
      isConnected,
      isEnding,
      onEnd,
      props.connectionDetails,
      props.sessionId,
      ptt,
      sessionHasStarted,
      showAgentPendingBubble,
      showUserPendingBubble,
      userCanSpeak,
    ],
  );

  return (
    <PrediagnosticsSessionContext.Provider value={value}>
      {props.children}
    </PrediagnosticsSessionContext.Provider>
  );
}
