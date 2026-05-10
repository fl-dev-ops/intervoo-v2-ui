import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  type DiagnosticReportPageState,
  DiagnosticReportPreviewPage,
  type FinalDiagnosticReport,
} from "@/components/diagnostics/report-preview-page";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DiagnosticsFinalReportPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/login");
  }

  const diagnostic = await prisma.diagnostic.findFirst({
    where: { userId: session.user.id },
    include: { user: { include: { profile: true } } },
    orderBy: { createdAt: "desc" },
  });

  if (!diagnostic) {
    redirect("/diagnostics/selection");
  }

  if (!diagnostic.finalReport) {
    redirect("/diagnostics/rounds");
  }

  const preferredName = diagnostic.user.profile?.preferredName;
  const report = toFinalDiagnosticReport(diagnostic.finalReport);
  const state: DiagnosticReportPageState = report
    ? { preferredName, report, status: "final-ready" }
    : {
        errorMessage: "The final report is ready, but its data is missing.",
        preferredName,
        status: "failed",
      };

  return (
    <DiagnosticReportPreviewPage
      publicUrl={
        diagnostic.finalReportShareToken
          ? `/d/${diagnostic.finalReportShareToken}`
          : null
      }
      showActions
      state={state}
    />
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
