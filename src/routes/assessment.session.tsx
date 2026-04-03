import { createFileRoute, redirect } from "@tanstack/react-router";
import { AssessmentSessionPage } from "#/features/assessment/session";
import { getSession } from "#/lib/auth.functions";

export const Route = createFileRoute("/assessment/session")({
  beforeLoad: async () => {
    const session = await getSession();

    if (!session?.user) {
      throw redirect({ to: "/register" });
    }

    if (!session.user.hasCompletedOnboarding) {
      throw redirect({ to: "/onboarding" });
    }

    return { session };
  },
  component: AssessmentSessionRoute,
});

function AssessmentSessionRoute() {
  const { session } = Route.useRouteContext();
  return <AssessmentSessionPage studentName={session.user.name} />;
}
