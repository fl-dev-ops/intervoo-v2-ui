import { createFileRoute } from "@tanstack/react-router";
import { DiagnosticsSelectionPage } from "#/features/diagnostics/selection-page";
import {
  requireDiagnosticsReport,
  requireDiagnosticsUser,
} from "#/features/diagnostics/route-data";

export const Route = createFileRoute("/diagnostics/")({
  beforeLoad: async () => {
    await requireDiagnosticsUser();
  },
  loader: async () => {
    const reportStatus = await requireDiagnosticsReport();
    return { reportStatus };
  },
  component: DiagnosticsRoute,
});

function DiagnosticsRoute() {
  const { reportStatus } = Route.useLoaderData();
  return <DiagnosticsSelectionPage reportStatus={reportStatus} />;
}
