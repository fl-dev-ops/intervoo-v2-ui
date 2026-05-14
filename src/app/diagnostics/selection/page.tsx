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

  // Fetch latest pre-diagnostic report for dream job & salary data
  const preDiagnosticSession = await prisma.interviewSession.findFirst({
    where: { userId: user.id, type: "PREDIAGNOSTIC" },
    include: { report: true },
    orderBy: { createdAt: "desc" },
  });

  const reportJson = preDiagnosticSession?.report?.reportJson;
  const dreamRole =
    typeof reportJson === "object" && reportJson !== null
      ? ((reportJson as Record<string, unknown>).dream_job ??
        (reportJson as Record<string, unknown>).aiming_for)
      : null;
  const targetSalary =
    typeof reportJson === "object" && reportJson !== null
      ? (reportJson as Record<string, unknown>).salary_expectation
      : null;

  const options = buildDiagnosticJobOptions();

  return (
    <DiagnosticsSelectionClient
      dreamRole={typeof dreamRole === "string" ? dreamRole : null}
      initialBand={existingDiagnostic?.selectedBand ?? null}
      options={options}
      targetSalary={typeof targetSalary === "string" ? targetSalary : null}
    />
  );
}
