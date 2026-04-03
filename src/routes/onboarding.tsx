import { createFileRoute, redirect } from "@tanstack/react-router";
import { OnboardingFlow, buildInitialProfile } from "#/features/onboarding";
import { getSession } from "#/lib/auth.functions";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async () => {
    const session = await getSession();

    if (!session?.user) {
      throw redirect({ to: "/register" });
    }

    if (session.user.hasCompletedOnboarding) {
      throw redirect({ to: "/assessment" });
    }

    return { session };
  },
  component: OnboardingPage,
});

function OnboardingPage() {
  const { session } = Route.useRouteContext();
  return (
    <OnboardingFlow
      initialProfile={buildInitialProfile({
        name: session.user.name,
        email: session.user.email,
        institution: session.user.profile?.institution,
        degree: session.user.profile?.degree,
        stream: session.user.profile?.stream,
        yearOfStudy: session.user.profile?.yearOfStudy,
      })}
    />
  );
}
