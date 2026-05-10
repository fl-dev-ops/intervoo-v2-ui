import { redirect } from "next/navigation";
import { DiagnosticsSelectionClient } from "@/components/diagnostics/selection-client";
import { prisma } from "@/lib/db";
import { buildDiagnosticJobOptions } from "@/lib/diagnostics/job-options";
import { requirePageStage } from "@/lib/stage-guards";

export default async function DiagnosticsSelectionPage() {
  const { user } = await requirePageStage(["DIAGNOSTICS"]);

  const existingDiagnostic = await prisma.diagnostic.findFirst({
    where: { userId: user.id },
    include: {
      rounds: { include: { session: { include: { report: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const completedRounds =
    existingDiagnostic?.rounds.filter(
      (round) =>
        round.status === "COMPLETED" || round.status === "REPORT_READY",
    ).length ?? 0;

  if (
    completedRounds === 4 &&
    existingDiagnostic?.rounds.every(
      (round) => round.session?.report?.status === "READY",
    )
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
