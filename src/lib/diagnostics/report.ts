import type { DiagnosticsSessionTranscript } from "#/lib/diagnostics/transcript";
import type { DiagnosticBand, DiagnosticJobOption } from "#/lib/diagnostics/job-options";

export type DiagnosticsReportStatusResponse = {
  session: {
    id: string;
    status: string;
    band: DiagnosticBand;
    selectedJob: DiagnosticJobOption | null;
    roomName: string;
    startedAt: string;
    endedAt: string | null;
    transcript: DiagnosticsSessionTranscript | null;
  };
  report: null | {
    id: string;
    status: string;
    promptVersion: string | null;
    reportJson: unknown;
    errorMessage: string | null;
    metadata: object | null;
  };
};
