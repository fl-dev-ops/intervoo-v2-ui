import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/prediagnostics/session")({
  beforeLoad: () => {
    throw redirect({ to: "/prediagnostics" });
  },
});
