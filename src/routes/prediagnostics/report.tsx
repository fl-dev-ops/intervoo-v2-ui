import { createFileRoute } from "@tanstack/react-router";
import { PrediagnosticsReportPage } from "#/features/prediagnostics/report-page";

export const Route = createFileRoute("/prediagnostics/report")({
  component: PrediagnosticsReportPage,
});
