import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "#/lib/auth.functions";
import { PreScreeningFlowProvider } from "#/lib/pre-screening-flow";

export const Route = createFileRoute("/pre-screening")({
  beforeLoad: async () => {
    const session = await getSession();

    if (!session?.user) {
      throw redirect({ to: "/login" });
    }

    if (!session.user.hasCompletedOnboarding) {
      throw redirect({ to: "/onboarding" });
    }

    return { session };
  },
  component: PreScreeningLayout,
});

function PreScreeningLayout() {
  return (
    <PreScreeningFlowProvider>
      <Outlet />
    </PreScreeningFlowProvider>
  );
}
