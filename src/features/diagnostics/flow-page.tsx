import { useCallback, useMemo, useState } from "react";
import { DiagnosticsPrejoinPage } from "#/features/diagnostics/prejoin-page";
import { DiagnosticsReportPage } from "#/features/diagnostics/report-page";
import { DiagnosticsSelectionPage } from "#/features/diagnostics/selection-page";
import { DiagnosticsSessionPage } from "#/features/diagnostics/session-page";
import {
  buildDiagnosticJobOptions,
  getDefaultDiagnosticBand,
  type DiagnosticBand,
} from "#/lib/diagnostics/job-options";
import type { DiagnosticsConnectionDetails } from "#/lib/livekit/diagnostics";
import type { PrediagnosticsReportStatusResponse } from "#/lib/prediagnostics/report";

type DiagnosticsFlowPhase = "selection" | "prejoin" | "session" | "report";

type DiagnosticsFlowPageProps = {
  reportStatus: PrediagnosticsReportStatusResponse;
  profile: {
    name: string;
    degree?: string | null;
    stream?: string | null;
    institution?: string | null;
  };
};

export function DiagnosticsFlowPage(props: DiagnosticsFlowPageProps) {
  const options = useMemo(
    () => buildDiagnosticJobOptions(props.reportStatus),
    [props.reportStatus],
  );
  const [phase, setPhase] = useState<DiagnosticsFlowPhase>("selection");
  const [selectedBand, setSelectedBand] = useState<DiagnosticBand | null>(() =>
    getDefaultDiagnosticBand(options),
  );
  const [connectionDetails, setConnectionDetails] = useState<DiagnosticsConnectionDetails | null>(
    null,
  );

  const handleSelected = useCallback((band: DiagnosticBand) => {
    setSelectedBand(band);
    setPhase("prejoin");
  }, []);

  const handleStarted = useCallback((details: DiagnosticsConnectionDetails) => {
    setConnectionDetails(details);
    setSelectedBand(details.band);
    setPhase("session");
  }, []);

  const handleFinished = useCallback(() => {
    setPhase("report");
  }, []);

  if (phase === "prejoin" && selectedBand) {
    return (
      <DiagnosticsPrejoinPage
        band={selectedBand}
        options={options}
        onBack={() => setPhase("selection")}
        onStarted={handleStarted}
      />
    );
  }

  if (phase === "session" && connectionDetails) {
    return (
      <DiagnosticsSessionPage connectionDetails={connectionDetails} onFinished={handleFinished} />
    );
  }

  if (phase === "report") {
    return (
      <DiagnosticsReportPage
        band={selectedBand ?? getDefaultDiagnosticBand(options) ?? "target"}
        options={options}
        profile={props.profile}
      />
    );
  }

  return <DiagnosticsSelectionPage reportStatus={props.reportStatus} onSelected={handleSelected} />;
}
