import { createFileRoute } from "@tanstack/react-router";
import { DiagnosticsFlowPage } from "#/features/diagnostics/flow-page";
import {
  requireDiagnosticsReport,
  requireDiagnosticsUser,
} from "#/features/diagnostics/route-data";

export const Route = createFileRoute("/diagnostics/")({
  beforeLoad: async () => {
    const user = await requireDiagnosticsUser();
    return {
      profile: {
        name: user.profile?.preferredName || user.name,
        degree: user.profile?.degree,
        stream: user.profile?.stream,
        institution: user.profile?.institution,
      },
    };
  },
  loader: async () => {
    const reportStatus = await requireDiagnosticsReport();
    return { reportStatus };
  },
  component: DiagnosticsRoute,
});

function DiagnosticsRoute() {
  const { profile } = Route.useRouteContext();
  const { reportStatus } = Route.useLoaderData();
  return <DiagnosticsFlowPage profile={profile} reportStatus={reportStatus} />;
}
