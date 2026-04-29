import { createFileRoute } from "@tanstack/react-router";
import { DiagnosticsPrejoinPage } from "#/features/diagnostics/prejoin-page";
import { buildDiagnosticJobOptions, parseDiagnosticBand } from "#/lib/diagnostics/job-options";
import {
  requireDiagnosticsReport,
  requireDiagnosticsUser,
} from "#/features/diagnostics/route-data";

export const Route = createFileRoute("/diagnostics/prejoin")({
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
  component: DiagnosticsPrejoinRoute,
});

function DiagnosticsPrejoinRoute() {
  const { band } = Route.useSearch();
  const { options } = Route.useLoaderData();

  return <DiagnosticsPrejoinPage band={band} options={options} />;
}
