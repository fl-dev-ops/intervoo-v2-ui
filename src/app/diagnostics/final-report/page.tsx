import { PublicDiagnosticReport } from "@/components/diagnostics/public-diagnostic-report";
import { DiagnosticReportPreviewPage } from "@/components/diagnostics/report-preview-page";
import { prisma } from "@/lib/db";
import { getDiagnosticBandConfig } from "@/lib/diagnostics/bands-config";
import {
  deriveFinalDiagnosticReport,
  saveFinalDiagnosticReport,
} from "@/lib/diagnostics/final-report";
import { DIAGNOSTIC_ROUNDS } from "@/lib/diagnostics/rounds-config";
import {
  isDiagnosticReportReady,
  isDiagnosticRoundStuckOrFailed,
} from "@/lib/diagnostics/rules";
import { updateUserStage } from "@/lib/progress";
import {
  getHydratedReportFromMetadata,
  toHydratedDiagnosticReport,
} from "@/lib/report-generation/diagnostic";
import type { DiagnosticReportJson } from "@/lib/report-generation/diagnostic-report.types";
import { requirePageStage } from "@/lib/stage-guards";

export default async function DiagnosticsFinalReportPage() {
  const { stage, user } = await requirePageStage(["DIAGNOSTICS", "COMPLETED"]);

  const diagnostic = await prisma.diagnostic.findFirst({
    where: { userId: user.id },
    include: {
      rounds: { include: { session: { include: { report: true } } } },
      user: { include: { resume: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!diagnostic) {
    console.info("[diagnostics] final report unavailable", {
      reason: "missing_diagnostic",
      userId: user.id,
    });
    return (
      <DiagnosticReportPreviewPage
        showActions={false}
        state={{
          errorMessage: "No completed diagnostic was found for this account.",
          status: "unavailable",
        }}
      />
    );
  }

  const bandConfig = getDiagnosticBandConfig(diagnostic.selectedBand);
  const preferredName = diagnostic.user.resume?.name ?? null;
  const rounds = DIAGNOSTIC_ROUNDS.map((config, index) => {
    const roundNumber = index + 1;
    const dbRound = diagnostic.rounds.find(
      (round) => round.roundNumber === roundNumber,
    );
    const roundReport = dbRound?.session?.report ?? null;

    if (isDiagnosticReportReady(roundReport?.status)) {
      const hydrated =
        getHydratedReportFromMetadata(roundReport.metadata) ??
        (roundReport.reportJson
          ? toHydratedDiagnosticReport(roundReport.reportJson)
          : null);
      if (hydrated) {
        return {
          roundNumber,
          roundType: config.id,
          roundTitle: config.title,
          hasReport: true as const,
          shareToken: roundReport.shareToken ?? null,
          report: hydrated as DiagnosticReportJson,
        };
      }
    }

    const isFailed = dbRound
      ? isDiagnosticRoundStuckOrFailed({
          roundType: dbRound.roundType,
          status: dbRound.status,
          startedAt: dbRound.session?.startedAt ?? null,
          reportStatus: dbRound.session?.report?.status ?? null,
          reportStartedAt: dbRound.session?.report?.startedAt ?? null,
        })
      : false;

    return {
      roundNumber,
      roundType: config.id,
      roundTitle: config.title,
      hasReport: false as const,
      shareToken: roundReport?.shareToken ?? null,
      report: null,
      isFailed,
    };
  });

  const readyRounds = rounds.filter((round) => round.hasReport);
  const allReady = readyRounds.length === 4;
  const overallScore = allReady
    ? Math.round(
        readyRounds.reduce(
          (sum, round) => sum + round.report.assessment_result.total_score,
          0,
        ) / 4,
      )
    : null;

  const report = allReady
    ? deriveFinalDiagnosticReport(diagnostic.rounds)
    : null;

  console.info("[diagnostics] final report state", {
    allReady,
    diagnosticId: diagnostic.id,
    readyRoundCount: readyRounds.length,
    reportReady: Boolean(report),
    rounds: diagnostic.rounds.map((round) => ({
      reportStatus: round.session?.report?.status ?? null,
      roundNumber: round.roundNumber,
      roundType: round.roundType,
      status: round.status,
    })),
    stage,
    userId: user.id,
  });

  if (!readyRounds.length) {
    return (
      <DiagnosticReportPreviewPage
        showActions={false}
        state={{
          errorMessage:
            "Your report is being prepared. Please check back shortly.",
          status: "processing",
        }}
      />
    );
  }

  if (report) {
    await saveFinalDiagnosticReport({ diagnosticId: diagnostic.id, report });
    await updateUserStage(user.id, "COMPLETED");
    await prisma.userProgress.updateMany({
      where: { userId: user.id },
      data: { diagnosticsCompletedAt: new Date() },
    });
  }

  return (
    <PublicDiagnosticReport
      backHref="/diagnostics/rounds"
      backLabel="Back to rounds"
      bandConfig={bandConfig}
      focusedRoundNumber={readyRounds[0]?.roundNumber ?? 1}
      isOwner={true}
      overallScore={overallScore}
      preferredName={preferredName}
      rounds={rounds}
      user={{ email: user.email ?? null, name: user.name ?? null }}
    />
  );
}
