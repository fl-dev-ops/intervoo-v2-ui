import { createFileRoute, redirect, stripSearchParams } from "@tanstack/react-router";
import { PrediagnosticsIndexPage } from "#/features/prediagnostics/index-page";
import { getSession } from "#/lib/auth.functions";
import { hasActiveOrCompletedPreDiagnosticSession } from "#/lib/prediagnostics/functions";

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

    const hasSession = await hasActiveOrCompletedPreDiagnosticSession();

    if (hasSession) {
      throw redirect({ to: "/prediagnostics/report" });
    }
  },
  component: PrediagnosticsIndexPage,
});
