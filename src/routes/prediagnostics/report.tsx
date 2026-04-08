import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "#/lib/auth.functions";
import { getLatestPreDiagnosticSessionStatus } from "#/lib/prediagnostics/functions";
import { PrediagnosticsReportPage } from "#/features/prediagnostics/report-page";
import type { PrediagnosticsReportStatusResponse } from "#/lib/prediagnostics/report";

function getBaseUrl() {
  if (typeof window !== "undefined") {
    return "";
  }

  return process.env.SERVER_URL || "http://localhost:3000";
}

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

    const response = await fetch(`${getBaseUrl()}/api/prediagnostics/generate-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: latest.session.id }),
    });

    if (!response.ok) {
      throw new Error("Failed to load report");
    }

    const reportStatus = (await response.json()) as PrediagnosticsReportStatusResponse;

    return { reportStatus };
  },
  component: PrediagnosticsReportRoute,
});

function PrediagnosticsReportRoute() {
  const { preferredName } = Route.useRouteContext();
  const { reportStatus } = Route.useLoaderData();

  return <PrediagnosticsReportPage preferredName={preferredName} reportStatus={reportStatus} />;
}
