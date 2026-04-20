import { useCallback, useEffect, useState } from "react";
import type { PrediagnosticsConnectionDetails } from "#/lib/livekit/prediagnostics";
import { PrediagnosticsGenerationStep } from "#/features/prediagnostics/generation-step";
import { PrediagnosticsPrejoinStep } from "#/features/prediagnostics/prejoin-step";
import { PrediagnosticsSessionStep } from "#/features/prediagnostics/session-step";
import type { PrediagnosticsReportStatusResponse } from "#/lib/prediagnostics/report";

type FlowPhase = "prejoin" | "session" | "generation";

export function PrediagnosticsFlowPage() {
  const [phase, setPhase] = useState<FlowPhase>("prejoin");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connectionDetails, setConnectionDetails] =
    useState<PrediagnosticsConnectionDetails | null>(null);
  const [isCheckingLatestReport, setIsCheckingLatestReport] = useState(true);

  const handleStarted = useCallback(
    (payload: { sessionId: string; connectionDetails: PrediagnosticsConnectionDetails }) => {
      setSessionId(payload.sessionId);
      setConnectionDetails(payload.connectionDetails);
      setPhase("session");
    },
    [],
  );

  const handleFinished = useCallback((payload: { sessionId: string }) => {
    setSessionId(payload.sessionId);
    setPhase("generation");
  }, []);

  const handleGenerationCompleted = useCallback(() => {
    window.location.href = "/prediagnostics/report";
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    if (searchParams.get("redo") === "true" || searchParams.get("redo") === "1") {
      setIsCheckingLatestReport(false);
      return;
    }

    let cancelled = false;

    async function checkLatestReport() {
      try {
        const statusResponse = await fetch("/api/prediagnostics/report-status");

        if (!statusResponse.ok) {
          return;
        }

        const statusPayload = (await statusResponse.json()) as PrediagnosticsReportStatusResponse;

        if (cancelled) {
          return;
        }

        if (statusPayload.report?.status === "READY" && statusPayload.report.reportJson) {
          window.location.href = "/prediagnostics/report";
        }
      } catch {
      } finally {
        if (!cancelled) {
          setIsCheckingLatestReport(false);
        }
      }
    }

    void checkLatestReport();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isCheckingLatestReport) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F5F3F7]">
        <p className="text-sm text-[#7f768f]">Loading...</p>
      </div>
    );
  }

  if (phase === "prejoin") {
    return <PrediagnosticsPrejoinStep onStarted={handleStarted} />;
  }

  if (phase === "session" && sessionId && connectionDetails) {
    return (
      <PrediagnosticsSessionStep
        connectionDetails={connectionDetails}
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

  return <PrediagnosticsPrejoinStep onStarted={handleStarted} />;
}
