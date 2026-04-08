import { useCallback, useState } from "react";
import type { PrediagnosticsConnectionDetails } from "#/lib/livekit/prediagnostics";
import { PrediagnosticsGenerationStep } from "#/features/prediagnostics/generation-step";
import { PrediagnosticsPrejoinStep } from "#/features/prediagnostics/prejoin-step";
import { PrediagnosticsSessionStep } from "#/features/prediagnostics/session-step";

type FlowPhase = "prejoin" | "session" | "generation";

export function PrediagnosticsFlowPage() {
  const [phase, setPhase] = useState<FlowPhase>("prejoin");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connectionDetails, setConnectionDetails] =
    useState<PrediagnosticsConnectionDetails | null>(null);

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
