import { redirect } from "next/navigation";
import { DiagnosticsRoundsClient } from "@/components/diagnostics/rounds-client";
import { prisma } from "@/lib/db";
import {
  buildDiagnosticJobOptions,
  getDiagnosticJobOption,
  parseDiagnosticBand,
} from "@/lib/diagnostics/job-options";
import { DIAGNOSTIC_ROUNDS } from "@/lib/diagnostics/rounds-config";
import { toHydratedDiagnosticReport } from "@/lib/report-generation/diagnostic";
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

  const rounds = diagnostic.rounds.map((round) => {
    const report = round.session?.report ?? null;
    const hydratedReport = report?.reportJson
      ? toHydratedDiagnosticReport(report.reportJson)
      : null;

    return {
      id: round.id,
      roundType: round.roundType,
      roundNumber: round.roundNumber,
      status: round.status,
      sessionId: round.sessionId,
      startedAt: round.session?.startedAt?.toISOString() ?? null,
      reportStatus: report?.status ?? null,
      reportShareToken: report?.shareToken ?? null,
      reportScore: hydratedReport?.assessment_result.total_score ?? null,
      reportStartedAt: report?.startedAt?.toISOString() ?? null,
    };
  });

  const allCompleted = DIAGNOSTIC_ROUNDS.every((config) => {
    const round = rounds.find((item) => item.roundType === config.id);
    return round?.status === "COMPLETED" || round?.status === "REPORT_READY";
  });

  if (allCompleted) {
    redirect("/diagnostics/final-report");
  }

  const reportsReadyCount = rounds.filter(
    (round) => round.reportStatus === "READY" && round.reportShareToken,
  ).length;
  const hasCompletedRound = rounds.some(
    (round) => round.status === "COMPLETED" || round.status === "REPORT_READY",
  );

  return (
    <DiagnosticsRoundsClient
      initialRounds={rounds}
      selectedJob={selectedJob}
      allCompleted={allCompleted}
      hasCompletedRound={hasCompletedRound}
      reportsReadyCount={reportsReadyCount}
      user={{ email: user.email ?? null, name: user.name ?? null }}
    />
  );
}
