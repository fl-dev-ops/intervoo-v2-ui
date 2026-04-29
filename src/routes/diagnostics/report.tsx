import { createFileRoute } from "@tanstack/react-router";
import { DiagnosticsReportPage } from "#/features/diagnostics/report-page";
import { buildDiagnosticJobOptions, parseDiagnosticBand } from "#/lib/diagnostics/job-options";
import {
  requireDiagnosticsReport,
  requireDiagnosticsUser,
} from "#/features/diagnostics/route-data";

export const Route = createFileRoute("/diagnostics/report")({
  validateSearch: (search: Record<string, unknown>) => ({
    band: parseDiagnosticBand(search.band) ?? "target",
  }),
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
    return { options: buildDiagnosticJobOptions(reportStatus) };
  },
  component: DiagnosticsReportRoute,
});

function DiagnosticsReportRoute() {
  const { band } = Route.useSearch();
  const { options } = Route.useLoaderData();
  const { profile } = Route.useRouteContext();

  return <DiagnosticsReportPage band={band} options={options} profile={profile} />;
}
