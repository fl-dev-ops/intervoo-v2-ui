import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "#/lib/auth.functions";
import { hasActiveOrCompletedPreDiagnosticSession } from "#/lib/prediagnostics/functions";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await getSession();

    if (!session?.user) {
      throw redirect({ to: "/register" });
    }

    if (!session.user.hasCompletedOnboarding) {
      throw redirect({ to: "/onboarding" });
    }

    const hasSession = await hasActiveOrCompletedPreDiagnosticSession();

    if (hasSession) {
      throw redirect({ to: "/prediagnostics/report" });
    }

    throw redirect({ to: "/prediagnostics" });
  },
  component: () => null,
});
