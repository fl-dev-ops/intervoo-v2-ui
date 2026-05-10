import { redirect } from "next/navigation";
import { DiagnosticsRoundsClient } from "@/components/diagnostics/rounds-client";
import { prisma } from "@/lib/db";
import {
  buildDiagnosticJobOptions,
  getDiagnosticJobOption,
  parseDiagnosticBand,
} from "@/lib/diagnostics/job-options";
import { requirePageStage } from "@/lib/stage-guards";

export default async function DiagnosticsRoundsPage() {
  const { user } = await requirePageStage(["DIAGNOSTICS", "COMPLETED"]);

  const diagnostic = await prisma.diagnostic.findFirst({
    where: { userId: user.id },
    include: {
      rounds: {
        include: {
          session: {
            include: { report: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!diagnostic?.selectedBand) {
    redirect("/diagnostics/selection");
  }

  const jobOptions = buildDiagnosticJobOptions();
  const selectedBand = parseDiagnosticBand(diagnostic.selectedBand);
  const selectedJob = getDiagnosticJobOption(jobOptions, selectedBand);

  if (!selectedJob) {
    redirect("/diagnostics/selection");
  }

  const rounds = diagnostic.rounds.map((round) => ({
    id: round.id,
    roundType: round.roundType,
    roundNumber: round.roundNumber,
    status: round.status,
    sessionId: round.sessionId,
    reportStatus: round.session?.report?.status ?? null,
    reportShareToken: round.session?.report?.shareToken ?? null,
  }));

  const completedCount = rounds.filter(
    (r) => r.status === "COMPLETED" || r.status === "REPORT_READY",
  ).length;

  const allCompleted = completedCount === 4;
  const reportsReadyCount = rounds.filter(
    (round) => round.reportStatus === "READY" && round.reportShareToken,
  ).length;

  return (
    <DiagnosticsRoundsClient
      initialRounds={rounds}
      selectedJob={selectedJob}
      allCompleted={allCompleted}
      completedCount={completedCount}
      reportsReadyCount={reportsReadyCount}
    />
  );
}
