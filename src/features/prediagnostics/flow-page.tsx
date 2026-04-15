import { useCallback, useEffect, useState } from "react";
import type { PrediagnosticsConnectionDetails } from "#/lib/livekit/prediagnostics";
import { PrediagnosticsGenerationStep } from "#/features/prediagnostics/generation-step";
import { PrediagnosticsPrejoinStep } from "#/features/prediagnostics/prejoin-step";
import { PrediagnosticsSessionStep } from "#/features/prediagnostics/session-step";
import type { PrediagnosticsMessage } from "#/features/prediagnostics/hooks/use-prediagnostics-messages";
import type { PrediagnosticsReportStatusResponse } from "#/lib/prediagnostics/report";
import {
  getPrediagnosticsSessionIdFromStorage,
  replacePrediagnosticsSessionIdInStorage,
  replacePrediagnosticsConnectionDetailsInStorage,
} from "#/shared/prediagnostics/session-storage";

type FlowPhase = "prejoin" | "session" | "generation";

type ResumableSession = {
  sessionId: string;
  initialMessages: PrediagnosticsMessage[];
};

export function PrediagnosticsFlowPage() {
  const [phase, setPhase] = useState<FlowPhase>("prejoin");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connectionDetails, setConnectionDetails] =
    useState<PrediagnosticsConnectionDetails | null>(null);
  const [initialMessages, setInitialMessages] = useState<PrediagnosticsMessage[]>([]);
  const [resumableSession, setResumableSession] = useState<ResumableSession | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  const toInitialMessages = useCallback(
    (statusPayload: PrediagnosticsReportStatusResponse): PrediagnosticsMessage[] =>
      (statusPayload.session.transcript?.messages ?? []).map((message) => ({
        id: message.id,
        role: message.role,
        kind: "transcript",
        text: message.text,
        timestamp: Date.parse(message.timestamp),
      })),
    [],
  );

  const handleStarted = useCallback(
    (payload: {
      sessionId: string;
      connectionDetails: PrediagnosticsConnectionDetails;
      initialMessages?: PrediagnosticsMessage[];
    }) => {
      setSessionId(payload.sessionId);
      setConnectionDetails(payload.connectionDetails);
      setInitialMessages(payload.initialMessages ?? []);
      setResumableSession(null);
      replacePrediagnosticsSessionIdInStorage(payload.sessionId);
      replacePrediagnosticsConnectionDetailsInStorage(payload.connectionDetails);
      setPhase("session");
    },
    [],
  );

  const handleFinished = useCallback((payload: { sessionId: string }) => {
    setSessionId(payload.sessionId);
    setInitialMessages([]);
    setResumableSession(null);
    replacePrediagnosticsSessionIdInStorage(payload.sessionId);
    replacePrediagnosticsConnectionDetailsInStorage(null);
    setPhase("generation");
  }, []);

  const handleGenerationCompleted = useCallback(() => {
    replacePrediagnosticsSessionIdInStorage(null);
    replacePrediagnosticsConnectionDetailsInStorage(null);
    window.location.href = "/prediagnostics/report";
  }, []);

  useEffect(() => {
    const activeSessionId = getPrediagnosticsSessionIdFromStorage();

    if (!activeSessionId) {
      setIsRestoringSession(false);
      return;
    }

    const restoredSessionId = activeSessionId;

    let cancelled = false;

    async function restoreSession() {
      try {
        const statusResponse = await fetch(
          `/api/prediagnostics/report-status?sessionId=${encodeURIComponent(restoredSessionId)}`,
        );

        if (!statusResponse.ok) {
          throw new Error("Unable to restore the current session");
        }

        const statusPayload = (await statusResponse.json()) as PrediagnosticsReportStatusResponse;

        if (cancelled) {
          return;
        }

        if (statusPayload.session.status === "STARTED") {
          setSessionId(restoredSessionId);
          setConnectionDetails(null);
          setInitialMessages([]);
          setResumableSession({
            sessionId: restoredSessionId,
            initialMessages: toInitialMessages(statusPayload),
          });
          setPhase("prejoin");
          return;
        }

        if (statusPayload.report?.status === "READY" && statusPayload.report.reportJson) {
          replacePrediagnosticsSessionIdInStorage(null);
          replacePrediagnosticsConnectionDetailsInStorage(null);
          window.location.href = "/prediagnostics/report";
          return;
        }

        setSessionId(restoredSessionId);
        setPhase("generation");
      } catch {
        if (!cancelled) {
          replacePrediagnosticsSessionIdInStorage(null);
          replacePrediagnosticsConnectionDetailsInStorage(null);
          setSessionId(null);
          setConnectionDetails(null);
          setInitialMessages([]);
          setResumableSession(null);
          setPhase("prejoin");
        }
      } finally {
        if (!cancelled) {
          setIsRestoringSession(false);
        }
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [toInitialMessages]);

  if (isRestoringSession) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F5F3F7]">
        <p className="text-sm text-[#7f768f]">Restoring your session...</p>
      </div>
    );
  }

  if (phase === "prejoin") {
    return (
      <PrediagnosticsPrejoinStep resumableSession={resumableSession} onStarted={handleStarted} />
    );
  }

  if (phase === "session" && sessionId && connectionDetails) {
    return (
      <PrediagnosticsSessionStep
        connectionDetails={connectionDetails}
        initialMessages={initialMessages}
        sessionId={sessionId}
        onFinished={handleFinished}
      />
    );
  }

  if (phase === "generation" && sessionId) {
    return (
      <PrediagnosticsGenerationStep sessionId={sessionId} onCompleted={handleGenerationCompleted} />
    );
  }

  return (
    <PrediagnosticsPrejoinStep resumableSession={resumableSession} onStarted={handleStarted} />
  );
}
