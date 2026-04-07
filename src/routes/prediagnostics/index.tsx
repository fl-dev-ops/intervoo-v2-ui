import { createFileRoute, redirect } from "@tanstack/react-router";
import { PrediagnosticsIndexPage } from "#/features/prediagnostics/index-page";
import { getSession } from "#/lib/auth.functions";
import { hasActiveOrCompletedPreDiagnosticSession } from "#/lib/prediagnostics/functions";

export const Route = createFileRoute("/prediagnostics/")({
  beforeLoad: async ({ location }) => {
    const session = await getSession();

    if (!session?.user) {
      throw redirect({ to: "/register" });
    }

    if (!session.user.hasCompletedOnboarding) {
      throw redirect({ to: "/onboarding" });
    }

    const fromOnboarding = new URLSearchParams(location.search).get("from") === "onboarding";
    const hasSession = await hasActiveOrCompletedPreDiagnosticSession();

    if (fromOnboarding) {
      return;
    }

    if (!hasSession) {
      throw redirect({ to: "/" });
    }
  },
  component: PrediagnosticsIndexPage,
});
