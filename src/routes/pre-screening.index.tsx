import { createFileRoute } from "@tanstack/react-router";
import { PreScreeningPage } from "#/pre-screening/pre-screening-page";

export const Route = createFileRoute("/pre-screening/")({
  component: PreScreeningPage,
});
