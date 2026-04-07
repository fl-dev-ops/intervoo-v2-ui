import { createFileRoute, redirect } from "@tanstack/react-router";
import { PrediagnosticsIndexPage } from "#/features/prediagnostics/index-page";
import { getSession } from "#/lib/auth.functions";

export const Route = createFileRoute("/prediagnostics/")({
  beforeLoad: async () => {
    const session = await getSession();

    if (!session?.user) {
      throw redirect({ to: "/register" });
    }

    if (!session.user.hasCompletedOnboarding) {
      throw redirect({ to: "/onboarding" });
    }
  },
  component: PrediagnosticsIndexPage,
});
