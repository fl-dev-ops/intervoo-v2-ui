import { createFileRoute, redirect } from "@tanstack/react-router";
import { AssessmentPage } from "#/features/assessment";
import { getSession } from "#/lib/auth.functions";

export const Route = createFileRoute("/assessment")({
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
  component: AssessmentPage,
});
