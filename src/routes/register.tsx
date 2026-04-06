import { createFileRoute, redirect } from "@tanstack/react-router";
import { RegisterFlow } from "#/features/register";
import { getSession } from "#/lib/auth.functions";

export const Route = createFileRoute("/register")({
  beforeLoad: async () => {
    const session = await getSession();

    if (session?.user) {
      throw redirect({
        to: session.user.hasCompletedOnboarding ? "/onboarding" : "/onboarding",
      });
    }
  },
  component: RegisterFlow,
});
