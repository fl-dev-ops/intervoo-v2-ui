import { createFileRoute } from "@tanstack/react-router";
import { PrediagnosticsSessionPage } from "#/features/prediagnostics/session-page";

export const Route = createFileRoute("/prediagnostics/session")({
  component: PrediagnosticsSessionPage,
});
