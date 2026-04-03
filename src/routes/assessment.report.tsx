import { createFileRoute, redirect } from "@tanstack/react-router";
import { AssessmentReportPage } from "#/features/assessment/report";
import { getSession } from "#/lib/auth.functions";

export const Route = createFileRoute("/assessment/report")({
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
  component: AssessmentReportPage,
});
