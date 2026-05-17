import { redirect } from "next/navigation";
import { DiagnosticsRoundsClient } from "@/components/diagnostics/rounds-client";
import { prisma } from "@/lib/db";
import {
  buildDiagnosticJobOptions,
  getDiagnosticJobOption,
  parseDiagnosticBand,
} from "@/lib/diagnostics/job-options";
import {
  areAllDiagnosticRoundsComplete,
  isDiagnosticReportReady,
  isDiagnosticSessionComplete,
  shouldShowDiagnosticBandSelection,
} from "@/lib/diagnostics/rules";
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

  if (!diagnostic || shouldShowDiagnosticBandSelection(diagnostic)) {
    console.info("[diagnostics] redirect", {
      from: "/diagnostics/rounds",
      reason: "missing_selected_band",
      to: "/diagnostics/selection",
      userId: user.id,
    });
    redirect("/diagnostics/selection");
  }

  const jobOptions = buildDiagnosticJobOptions();
  const selectedBand = parseDiagnosticBand(diagnostic.selectedBand);
  const selectedJob = getDiagnosticJobOption(jobOptions, selectedBand);

  if (!selectedJob) {
    console.info("[diagnostics] redirect", {
      from: "/diagnostics/rounds",
      reason: "invalid_selected_job",
      selectedBand: diagnostic.selectedBand,
      to: "/diagnostics/selection",
      userId: user.id,
    });
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

  const allCompleted = areAllDiagnosticRoundsComplete(rounds);

  console.info("[diagnostics] rounds page state", {
    allCompleted,
    diagnosticId: diagnostic.id,
    rounds,
    selectedBand: diagnostic.selectedBand,
    selectedJob: selectedJob.title,
    userId: user.id,
  });

  if (allCompleted) {
    console.info("[diagnostics] redirect", {
      from: "/diagnostics/rounds",
      reason: "all_rounds_completed",
      to: "/diagnostics/final-report",
      userId: user.id,
    });
    redirect("/diagnostics/final-report");
  }

  const reportsReadyCount = rounds.filter(
    (round) =>
      isDiagnosticReportReady(round.reportStatus) && round.reportShareToken,
  ).length;
  const hasCompletedRound = rounds.some((round) =>
    isDiagnosticSessionComplete(round.status),
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
