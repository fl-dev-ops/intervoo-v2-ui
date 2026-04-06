import { createFileRoute } from "@tanstack/react-router";
import { PrediagnosticsIndexPage } from "#/features/prediagnostics/index-page";

export const Route = createFileRoute("/prediagnostics/")({
  component: PrediagnosticsIndexPage,
});
