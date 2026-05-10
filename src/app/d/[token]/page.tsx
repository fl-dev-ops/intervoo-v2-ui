import {
  type DiagnosticReportPageState,
  DiagnosticReportPreviewPage,
  type FinalDiagnosticReport,
} from "@/components/diagnostics/report-preview-page";
import { ReportView } from "@/components/diagnostics/report-view";
import { prisma } from "@/lib/db";
import { buildDiagnosticJobOptions } from "@/lib/diagnostics/job-options";
import { toHydratedDiagnosticReport } from "@/lib/report-generation/diagnostic";

export default async function PublicDiagnosticReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const roundReport = await prisma.report.findUnique({
    where: { shareToken: token },
    include: {
      session: {
        include: {
          diagnosticRound: { include: { diagnostic: true } },
          user: { include: { profile: true } },
        },
      },
    },
  });

  if (roundReport) {
    return <PublicDiagnosticRoundReport report={roundReport} />;
  }

  const state = await getPublicFinalDiagnosticReportState(token);

  return <DiagnosticReportPreviewPage state={state} />;
}

async function getPublicFinalDiagnosticReportState(
  token: string,
): Promise<DiagnosticReportPageState> {
  const diagnostic = await prisma.diagnostic.findUnique({
    where: { finalReportShareToken: token },
    include: { user: { include: { profile: true } } },
  });

  if (!diagnostic) {
    return {
      errorMessage:
        "No public report was found for this link. It may have expired or the link is invalid.",
      status: "unavailable",
    };
  }

  const preferredName = diagnostic.user.profile?.preferredName;
  const report = toFinalDiagnosticReport(diagnostic.finalReport);

  if (!report) {
    return {
      errorMessage: "The final report is not available yet.",
      preferredName,
      status: "processing",
    };
  }

  return { preferredName, report, status: "final-ready" };
}

function PublicDiagnosticRoundReport({
  report,
}: {
  report: {
    errorMessage: string | null;
    reportJson: unknown;
    status: string;
    session: {
      metadata: unknown;
      type: string;
      diagnosticRound: {
        diagnostic: { selectedBand: string | null };
        roundNumber: number;
        roundType: string;
      } | null;
      user: { profile: { preferredName: string } | null };
    };
  };
}) {
  if (report.session.type !== "DIAGNOSTIC_ROUND") {
    return (
      <PublicReportError message="No public diagnostic report was found for this link. It may have expired or the link is invalid." />
    );
  }

  if (report.status !== "READY") {
    return (
      <PublicReportError
        message={
          report.status === "FAILED"
            ? (report.errorMessage ?? "Report generation failed.")
            : "The report is still processing. Please check this link again shortly."
        }
      />
    );
  }

  const hydratedReport = toHydratedDiagnosticReport(report.reportJson);

  if (!hydratedReport) {
    return (
      <PublicReportError message="The report is ready, but its data is missing." />
    );
  }

  const metadata = report.session.metadata as Record<string, unknown> | null;
  const band =
    typeof metadata?.band === "string"
      ? metadata.band
      : (report.session.diagnosticRound?.diagnostic.selectedBand ?? "band2");
  const options = buildDiagnosticJobOptions();

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground">
      <header className="mx-auto w-full max-w-lg text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Shared via Intervoo
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          Diagnostic Report
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Your interview readiness summary across thinking, language, and
          confidence.
        </p>
      </header>

      <div className="mx-auto mt-8 w-full max-w-4xl pb-10">
        <ReportView band={band} options={options} report={hydratedReport} />
      </div>
    </main>
  );
}

function PublicReportError({ message }: { message: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <h2 className="text-xl font-semibold text-foreground">
          Report unavailable
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {message}
        </p>
      </div>
    </div>
  );
}

function toFinalDiagnosticReport(
  reportJson: unknown,
): FinalDiagnosticReport | null {
  if (
    !reportJson ||
    typeof reportJson !== "object" ||
    Array.isArray(reportJson)
  ) {
    return null;
  }

  return reportJson as FinalDiagnosticReport;
}
