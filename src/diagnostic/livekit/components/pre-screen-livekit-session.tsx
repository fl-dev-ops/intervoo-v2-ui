import { useEffect, useMemo, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useMediaDeviceSelect,
  useTranscriptions,
} from "@livekit/components-react";
import { DisconnectReason } from "livekit-client";
import { LoaderCircle, Mic, PhoneOff } from "lucide-react";
import type { PreScreeningConnectionDetails } from "../types";
import { getPushToTalkButtonLabel, getControlBarLabel, usePushToTalk } from "../push-to-talk";
import { normalizePreScreenTranscriptMessages } from "../utils/transcript";
import { MicrophonePermissionGate } from "./microphone-permission-gate";

interface PreScreenLiveKitSessionProps {
  connection: PreScreeningConnectionDetails;
  pending: boolean;
  studentName?: string | null;
  onExit: () => void;
  onSessionEnded: () => void;
  onRetry: () => Promise<void>;
}

function isIntentionalServerEnd(reason?: DisconnectReason): boolean {
  const extendedReasons = DisconnectReason as unknown as Record<
    string,
    DisconnectReason | undefined
  >;

  return (
    reason === DisconnectReason.PARTICIPANT_REMOVED ||
    reason === DisconnectReason.ROOM_DELETED ||
    reason === extendedReasons.ROOM_CLOSED ||
    reason === extendedReasons.SERVER_SHUTDOWN
  );
}

export function PreScreenLiveKitSession({
  connection,
  pending,
  studentName,
  onExit,
  onSessionEnded,
  onRetry,
}: PreScreenLiveKitSessionProps) {
  const [roomError, setRoomError] = useState<string | null>(null);
  const [wasDisconnected, setWasDisconnected] = useState(false);

  if (wasDisconnected) {
    return (
      <div className="pre-screen-session-shell">
        <div className="pre-screen-session-error-card">
          <h3>The interview session ended</h3>
          <p>Your session disconnected before the pre-screen finished.</p>
          <div className="pre-screen-session-error-actions">
            <button className="secondary-button" type="button" onClick={onExit}>
              Back to preview
            </button>
            <button
              className="primary-button primary-button--pill"
              disabled={pending}
              type="button"
              onClick={() => void onRetry()}
            >
              {pending ? "Reconnecting..." : "Reconnect"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pre-screen-session-shell">
      {roomError ? <div className="pre-screen-session-banner">{roomError}</div> : null}

      <MicrophonePermissionGate>
        <LiveKitRoom
          token={connection.participantToken}
          serverUrl={connection.serverUrl}
          connect
          audio={false}
          onError={(error) => setRoomError(error.message)}
          onDisconnected={(reason) => {
            if (isIntentionalServerEnd(reason)) {
              onSessionEnded();
              return;
            }

            setWasDisconnected(true);
          }}
          className="pre-screen-livekit-room"
        >
          <RoomAudioRenderer />
          <PreScreenLiveKitSessionContent
            pending={pending}
            studentName={studentName}
            onEndSession={onSessionEnded}
          />
        </LiveKitRoom>
      </MicrophonePermissionGate>
    </div>
  );
}

function PreScreenLiveKitSessionContent({
  pending,
  studentName,
  onEndSession,
}: {
  pending: boolean;
  studentName?: string | null;
  onEndSession: () => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const transcriptions = useTranscriptions();
  const [clientError, setClientError] = useState<string | null>(null);

  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({
    kind: "audioinput",
    requestPermissions: false,
  });

  const { pttState, canRecord, isAgentReady, error, toggleRecording } = usePushToTalk({
    onError: setClientError,
  });

  const messages = normalizePreScreenTranscriptMessages(transcriptions, localParticipant?.identity);
  const controlBarLabel = getControlBarLabel(pttState, isAgentReady);
  const buttonLabel = getPushToTalkButtonLabel(pttState, isAgentReady);
  const activeTurnStartedAtRef = useRef<number | null>(null);
  const [isAwaitingAgentResponse, setIsAwaitingAgentResponse] = useState(false);
  const pendingAgentBaselineIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (pttState === "recording" && activeTurnStartedAtRef.current === null) {
      activeTurnStartedAtRef.current = Date.now();
      return;
    }

    if (pttState !== "recording") {
      activeTurnStartedAtRef.current = null;
    }
  }, [pttState]);

  const inProgressUserTranscript = useMemo(() => {
    if (pttState !== "recording") {
      return null;
    }

    const localIdentity = localParticipant?.identity;
    const activeTurnStartedAt = activeTurnStartedAtRef.current;

    if (!localIdentity || activeTurnStartedAt === null) {
      return null;
    }

    const relevantSegments = transcriptions.filter((segment) => {
      if (segment.participantInfo?.identity !== localIdentity) {
        return false;
      }

      if (!segment.text.trim()) {
        return false;
      }

      return segment.streamInfo.timestamp >= activeTurnStartedAt;
    });

    if (!relevantSegments.length) {
      return null;
    }

    return relevantSegments
      .map((segment) => segment.text.trim())
      .join(" ")
      .trim();
  }, [localParticipant?.identity, pttState, transcriptions]);

  const visibleMessages = useMemo(() => {
    const activeTurnStartedAt = activeTurnStartedAtRef.current;

    const filteredMessages =
      pttState === "recording" && activeTurnStartedAt !== null
        ? messages.filter((message) => {
            if (message.role !== "user") {
              return true;
            }

            return new Date(message.timestamp).getTime() < activeTurnStartedAt;
          })
        : messages;

    return collapseAdjacentMessages(filteredMessages);
  }, [messages, pttState]);

  const micStateLabel = getMicStateLabel(pttState);
  const lastVisibleMessage = visibleMessages[visibleMessages.length - 1];
  const lastAgentMessage =
    [...visibleMessages].reverse().find((message) => message.role === "agent") ?? null;

  useEffect(() => {
    if (pttState === "processing" || pttState === "agent_speaking") {
      if (!isAwaitingAgentResponse) {
        pendingAgentBaselineIdRef.current = lastAgentMessage?.id ?? null;
        setIsAwaitingAgentResponse(true);
      }
      return;
    }

    if (pttState === "recording") {
      setIsAwaitingAgentResponse(false);
      pendingAgentBaselineIdRef.current = null;
    }
  }, [isAwaitingAgentResponse, lastAgentMessage?.id, pttState]);

  useEffect(() => {
    if (!isAwaitingAgentResponse) {
      return;
    }

    if (lastAgentMessage && lastAgentMessage.id !== pendingAgentBaselineIdRef.current) {
      setIsAwaitingAgentResponse(false);
      pendingAgentBaselineIdRef.current = null;
    }
  }, [isAwaitingAgentResponse, lastAgentMessage]);

  const showAgentLoader =
    visibleMessages.length > 0 && isAwaitingAgentResponse && lastVisibleMessage?.role !== "agent";

  return (
    <div className="pre-screen-session-card">
      <header className="pre-screen-session-header">
        <div className="pre-screen-session-agent">
          <div className="pre-screen-session-agent-avatar">🤖</div>
          <div>
            <div className="pre-screen-session-agent-name">Sana · AI Guide</div>
            <div className="pre-screen-session-agent-subtitle">
              {studentName?.trim() || "Pre-screening diagnostic"}
            </div>
          </div>
        </div>

        <button className="pre-screen-session-end-button" type="button" onClick={onEndSession}>
          <PhoneOff className="h-4 w-4" />
          End
        </button>
      </header>

      <div className="pre-screen-session-progress">
        <div className="pre-screen-session-progress-block is-active">
          <div className="pre-screen-session-progress-label">🎯 Job Plans</div>
          <div className="pre-screen-session-progress-bar">
            <span style={{ width: messages.length > 2 ? "55%" : "28%" }} />
          </div>
        </div>
        <div
          className={`pre-screen-session-progress-block${messages.length > 5 ? " is-active" : ""}`}
        >
          <div className="pre-screen-session-progress-label">🔍 Job Research</div>
          <div className="pre-screen-session-progress-bar">
            <span style={{ width: messages.length > 5 ? "38%" : "0%" }} />
          </div>
        </div>
      </div>

      <div className="pre-screen-session-body">
        {visibleMessages.length === 0 ? (
          <div className="pre-screen-empty-state">
            <div className="pre-screen-empty-state-label">Preparing the conversation</div>
          </div>
        ) : (
          <div className="pre-screen-message-list">
            {visibleMessages.map((message) => (
              <article
                key={message.id}
                className={`pre-screen-message${message.role === "agent" ? " is-agent" : " is-user"}`}
              >
                <div className="pre-screen-message-avatar">
                  {message.role === "agent" ? "🤖" : "👤"}
                </div>
                <div className="pre-screen-message-bubble">
                  <p>{message.text}</p>
                </div>
              </article>
            ))}

            {showAgentLoader ? (
              <article className="pre-screen-message is-agent">
                <div className="pre-screen-message-avatar">🤖</div>
                <div className="pre-screen-message-bubble pre-screen-message-bubble--loader">
                  <div className="pre-screen-loader-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <p>Thinking...</p>
                </div>
              </article>
            ) : null}
          </div>
        )}
      </div>

      <footer className="pre-screen-session-footer">
        <div className="pre-screen-session-footer-label">{controlBarLabel}</div>

        {inProgressUserTranscript ? (
          <div className="pre-screen-session-live-transcript">{inProgressUserTranscript}</div>
        ) : null}

        <div className="pre-screen-session-control-row">
          <div className="pre-screen-session-input-shell">
            <span
              className={`pre-screen-session-input-dot${pttState === "recording" ? " is-live" : ""}`}
            />
            <span>{micStateLabel}</span>
          </div>

          <button
            className={`pre-screen-session-mic-button${pttState === "recording" ? " is-recording" : ""}`}
            disabled={!canRecord || pending}
            type="button"
            onClick={() => void toggleRecording()}
          >
            {pending ? (
              <LoaderCircle className="h-7 w-7 animate-spin" />
            ) : (
              <Mic className="h-7 w-7" />
            )}
            <span className="sr-only">{buttonLabel}</span>
          </button>
        </div>

        {devices.length > 1 ? (
          <label className="pre-screen-session-device-picker">
            <span>Mic</span>
            <select
              value={activeDeviceId || devices[0]?.deviceId || ""}
              onChange={(event) => {
                void setActiveMediaDevice(event.target.value);
              }}
            >
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || "Microphone"}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {clientError || error ? (
          <div className="pre-screen-session-banner">{clientError || error}</div>
        ) : null}
      </footer>
    </div>
  );
}

function getMicStateLabel(state: string) {
  if (state === "recording") {
    return "Listening";
  }

  if (state === "processing" || state === "agent_speaking") {
    return "Speaking";
  }

  return "Listening";
}

function collapseAdjacentMessages(
  messages: ReturnType<typeof normalizePreScreenTranscriptMessages>,
) {
  return messages.reduce<typeof messages>((result, message) => {
    const previous = result[result.length - 1];

    if (!previous || previous.role !== message.role) {
      result.push({ ...message });
      return result;
    }

    previous.text = `${previous.text} ${message.text}`.trim();
    previous.timestamp = message.timestamp;
    return result;
  }, []);
}
