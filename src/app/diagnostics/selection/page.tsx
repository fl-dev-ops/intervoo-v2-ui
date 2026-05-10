import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DiagnosticsSelectionClient } from "@/components/diagnostics/selection-client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildDiagnosticJobOptions } from "@/lib/diagnostics/job-options";

export default async function DiagnosticsSelectionPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/login");
  }

  const existingDiagnostic = await prisma.diagnostic.findFirst({
    where: { userId: session.user.id },
    include: { rounds: { select: { id: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });

  const completedRounds =
    existingDiagnostic?.rounds.filter(
      (round) =>
        round.status === "COMPLETED" || round.status === "REPORT_READY",
    ).length ?? 0;

  if (
    existingDiagnostic?.finalReport &&
    existingDiagnostic.finalReportShareToken &&
    completedRounds === 4
  ) {
    redirect("/diagnostics/final-report");
  }

  if (existingDiagnostic?.rounds.length) {
    redirect("/diagnostics/rounds");
  }

  const options = buildDiagnosticJobOptions();

  return (
    <DiagnosticsSelectionClient
      initialBand={existingDiagnostic?.selectedBand ?? null}
      options={options}
    />
  );
}
