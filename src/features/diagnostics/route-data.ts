import { redirect } from "@tanstack/react-router";
import { getSession } from "#/lib/auth.functions";
import { getLatestPreDiagnosticSessionStatus } from "#/lib/prediagnostics/functions";

export async function requireDiagnosticsUser() {
  const session = await getSession();

  if (!session?.user) {
    throw redirect({ to: "/register" });
  }

  if (!session.user.hasCompletedOnboarding) {
    throw redirect({ to: "/onboarding" });
  }

  return session.user;
}

export async function requireDiagnosticsReport() {
  const latest = await getLatestPreDiagnosticSessionStatus();

  if (latest?.report?.status === "READY" && latest.report.reportJson) {
    return latest;
  }

  throw redirect({ to: "/prediagnostics", search: { redo: false } });
}
