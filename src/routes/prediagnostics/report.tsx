import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "#/lib/auth.functions";
import { PrediagnosticsReportPage } from "#/features/prediagnostics/report-page";
import type { PrediagnosticsReportStatusResponse } from "#/lib/prediagnostics/report";

export const Route = createFileRoute("/prediagnostics/report")({
  beforeLoad: async () => {
    const session = await getSession();

    if (!session?.user) {
      throw redirect({ to: "/register" });
    }

    const preferredName = session.user.profile?.preferredName?.trim();
    const fallbackName = session.user.name.trim().split(/\s+/).filter(Boolean)[0];

    return {
      preferredName: preferredName || fallbackName || null,
    };
  },
  loader: async ({ location }) => {
    const sessionId = new URLSearchParams(location.search).get("sessionId");

    if (!sessionId) {
      throw redirect({ to: "/prediagnostics" });
    }

    const response = await fetch("/api/prediagnostics/generate-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
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
