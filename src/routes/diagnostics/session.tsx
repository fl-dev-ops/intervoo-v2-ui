import { createFileRoute } from "@tanstack/react-router";
import { DiagnosticsSessionPage } from "#/features/diagnostics/session-page";
import { buildDiagnosticJobOptions, parseDiagnosticBand } from "#/lib/diagnostics/job-options";
import {
  requireDiagnosticsReport,
  requireDiagnosticsUser,
} from "#/features/diagnostics/route-data";

export const Route = createFileRoute("/diagnostics/session")({
  validateSearch: (search: Record<string, unknown>) => ({
    band: parseDiagnosticBand(search.band) ?? "target",
  }),
  beforeLoad: async () => {
    await requireDiagnosticsUser();
  },
  loader: async () => {
    const reportStatus = await requireDiagnosticsReport();
    return { options: buildDiagnosticJobOptions(reportStatus) };
  },
  component: DiagnosticsSessionRoute,
});

function DiagnosticsSessionRoute() {
  const { band } = Route.useSearch();
  const { options } = Route.useLoaderData();

  return <DiagnosticsSessionPage band={band} options={options} />;
}
