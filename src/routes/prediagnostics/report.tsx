import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "#/lib/auth.functions";
import {
  getLatestPreDiagnosticSessionStatus,
  generateReport,
} from "#/lib/prediagnostics/functions";
import { PrediagnosticsReportPage } from "#/features/prediagnostics/report-page";

export const Route = createFileRoute("/prediagnostics/report")({
  beforeLoad: async () => {
    const session = await getSession();

    if (!session?.user) {
      throw redirect({ to: "/register" });
    }

    if (!session.user.hasCompletedOnboarding) {
      throw redirect({ to: "/onboarding" });
    }

    const preferredName = session.user.profile?.preferredName?.trim();
    const fallbackName = session.user.name.trim().split(/\s+/).filter(Boolean)[0];

    return {
      preferredName: preferredName || fallbackName || null,
    };
  },
  loader: async () => {
    const latest = await getLatestPreDiagnosticSessionStatus();

    if (!latest) {
      throw redirect({ to: "/prediagnostics", search: { redo: false } });
    }

    if (latest.report?.status === "READY" && latest.report.reportJson) {
      return { reportStatus: latest };
    }

    if (latest.report?.status === "FAILED") {
      throw redirect({ to: "/prediagnostics", search: { redo: false } });
    }

    const reportStatus = await generateReport();

    if (!reportStatus) {
      throw new Error("Failed to load report");
    }

    return { reportStatus };
  },
  component: PrediagnosticsReportRoute,
});

function PrediagnosticsReportRoute() {
  const { preferredName } = Route.useRouteContext();
  const { reportStatus } = Route.useLoaderData();

  return <PrediagnosticsReportPage preferredName={preferredName} reportStatus={reportStatus} />;
}
