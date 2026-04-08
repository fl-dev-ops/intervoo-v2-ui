import { createFileRoute, redirect, stripSearchParams } from "@tanstack/react-router";
import { PrediagnosticsFlowPage } from "#/features/prediagnostics/flow-page";
import { getSession } from "#/lib/auth.functions";
import { getLatestPreDiagnosticSessionStatus } from "#/lib/prediagnostics/functions";

export const Route = createFileRoute("/prediagnostics/")({
  validateSearch: (search: Record<string, unknown>) => ({
    redo: search.redo === "true" || search.redo === "1" || search.redo === true,
  }),
  search: {
    middlewares: [stripSearchParams({ redo: false })],
  },
  beforeLoad: async ({ search }) => {
    const session = await getSession();

    if (!session?.user) {
      throw redirect({ to: "/register" });
    }

    if (!session.user.hasCompletedOnboarding) {
      throw redirect({ to: "/onboarding" });
    }

    if (search.redo) {
      return;
    }

    const latestSession = await getLatestPreDiagnosticSessionStatus();

    if (latestSession?.report?.status === "READY" && latestSession.report.reportJson) {
      throw redirect({ to: "/prediagnostics/report" });
    }
  },
  component: PrediagnosticsFlowPage,
});
