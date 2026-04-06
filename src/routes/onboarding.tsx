import { createFileRoute, redirect } from "@tanstack/react-router";
import { OnboardingFlow, buildInitialProfile } from "#/features/onboarding";
import { getSession } from "#/lib/auth.functions";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async () => {
    const session = await getSession();

    if (!session?.user) {
      throw redirect({ to: "/register" });
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
        preferredName: session.user.profile?.preferredName,
        institution: session.user.profile?.institution,
        degree: session.user.profile?.degree,
        stream: session.user.profile?.stream,
        yearOfStudy: session.user.profile?.yearOfStudy,
        placementPreparation: session.user.profile?.placementPreparation,
        academySelection: session.user.profile?.academySelection,
        academyName: session.user.profile?.academyName,
      })}
    />
  );
}
