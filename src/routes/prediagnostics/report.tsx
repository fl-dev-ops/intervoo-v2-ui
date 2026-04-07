import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "#/lib/auth.functions";
import { PrediagnosticsReportPage } from "#/features/prediagnostics/report-page";

export const Route = createFileRoute("/prediagnostics/report")({
  beforeLoad: async () => {
    const session = await getSession();

    if (!session?.user) {
      throw redirect({ to: "/register" });
    }

    const preferredName = session.user.profile?.preferredName?.trim();
    const fallbackName = session.user.name.trim().split(/\s+/).filter(Boolean)[0];

    return {
      preferredName: preferredName || fallbackName || null,
    };
  },
  component: PrediagnosticsReportRoute,
});

function PrediagnosticsReportRoute() {
  const { preferredName } = Route.useRouteContext();

  return <PrediagnosticsReportPage preferredName={preferredName} />;
}
