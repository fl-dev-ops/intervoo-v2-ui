import {
  type PrediagnosticsReportPageState,
  PrediagnosticsReportPreviewPage,
  type PrediagnosticsReportPreviewReport,
} from "@/components/prediagnostics/report-preview-page";
import { prisma } from "@/lib/db";

export default async function PublicPreDiagnosticsReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const report = await prisma.report.findUnique({
    where: { shareToken: token },
    include: {
      session: {
        include: { user: { include: { profile: true } } },
      },
    },
  });

  const state = getPublicPreDiagnosticsReportState(report);

  return <PrediagnosticsReportPreviewPage showActions={false} state={state} />;
}

function getPublicPreDiagnosticsReportState(
  report:
    | ({
        errorMessage: string | null;
        reportJson: unknown;
        status: string;
      } & {
        session: {
          type: string;
          user: { profile: { preferredName: string } | null };
        };
      })
    | null,
): PrediagnosticsReportPageState {
  if (!report || report.session.type !== "PREDIAGNOSTIC") {
    return {
      errorMessage:
        "No public report was found for this link. It may have expired or the link is invalid.",
      status: "unavailable",
    };
  }

  const preferredName = report.session.user.profile?.preferredName;

  if (report.status === "FAILED") {
    return {
      errorMessage: report.errorMessage ?? "Report generation failed.",
      preferredName,
      status: "failed",
    };
  }

  if (report.status !== "READY") {
    return {
      preferredName,
      status: report.status === "PENDING" ? "pending" : "processing",
    };
  }

  const reportJson = toPrediagnosticsReport(report.reportJson);

  if (!reportJson) {
    return {
      errorMessage: "The report is ready, but its data is missing.",
      preferredName,
      status: "failed",
    };
  }

  return { preferredName, report: reportJson, status: "ready" };
}

function toPrediagnosticsReport(
  reportJson: unknown,
): PrediagnosticsReportPreviewReport | null {
  if (
    !reportJson ||
    typeof reportJson !== "object" ||
    Array.isArray(reportJson)
  ) {
    return null;
  }

  return reportJson as PrediagnosticsReportPreviewReport;
}
