import { PublicDiagnosticReport } from "@/components/diagnostics/public-diagnostic-report";
import { DiagnosticReportPreviewPage } from "@/components/diagnostics/report-preview-page";
import { prisma } from "@/lib/db";
import { getDiagnosticBandConfig } from "@/lib/diagnostics/bands-config";
import {
  deriveFinalDiagnosticReport,
  ensureFinalDiagnosticShareToken,
} from "@/lib/diagnostics/final-report";
import { DIAGNOSTIC_ROUNDS } from "@/lib/diagnostics/rounds-config";
import { isDiagnosticReportReady } from "@/lib/diagnostics/rules";
import { updateUserStage } from "@/lib/progress";
import { toHydratedDiagnosticReport } from "@/lib/report-generation/diagnostic";
import { requirePageStage } from "@/lib/stage-guards";

export default async function DiagnosticsFinalReportPage() {
  const { stage, user } = await requirePageStage(["DIAGNOSTICS", "COMPLETED"]);

  const diagnostic = await prisma.diagnostic.findFirst({
    where: { userId: user.id },
    include: {
      rounds: { include: { session: { include: { report: true } } } },
      user: { include: { profile: true } },
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

  const report = deriveFinalDiagnosticReport(diagnostic.rounds);

  console.info("[diagnostics] final report state", {
    diagnosticId: diagnostic.id,
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

  if (!report) {
    return (
      <DiagnosticReportPreviewPage
        showActions={false}
        state={{
          errorMessage:
            stage === "COMPLETED"
              ? "Your final report is not available yet. Please check your diagnostic round reports."
              : "Your final report is being prepared. Please check back shortly.",
          status: "processing",
        }}
      />
    );
  }

  await ensureFinalDiagnosticShareToken(diagnostic.id);
  await updateUserStage(user.id, "COMPLETED");
  await prisma.userProgress.updateMany({
    where: { userId: user.id },
    data: { diagnosticsCompletedAt: new Date() },
  });

  const bandConfig = getDiagnosticBandConfig(diagnostic.selectedBand);
  const preferredName = diagnostic.user.profile?.preferredName ?? null;
  const rounds = DIAGNOSTIC_ROUNDS.map((config, index) => {
    const roundNumber = index + 1;
    const dbRound = diagnostic.rounds.find(
      (round) => round.roundNumber === roundNumber,
    );
    const roundReport = dbRound?.session?.report ?? null;

    if (
      isDiagnosticReportReady(roundReport?.status) &&
      roundReport.reportJson
    ) {
      const hydrated = toHydratedDiagnosticReport(roundReport.reportJson);
      if (hydrated) {
        return {
          roundNumber,
          roundType: config.id,
          roundTitle: config.title,
          hasReport: true as const,
          shareToken: roundReport.shareToken ?? null,
          report: hydrated,
        };
      }
    }

    return {
      roundNumber,
      roundType: config.id,
      roundTitle: config.title,
      hasReport: false as const,
      shareToken: roundReport?.shareToken ?? null,
      report: null,
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

  return (
    <PublicDiagnosticReport
      bandConfig={bandConfig}
      currentRound={diagnostic.currentRound}
      focusedRoundNumber={readyRounds[0]?.roundNumber ?? 1}
      isOwner={true}
      overallScore={overallScore}
      preferredName={preferredName}
      rounds={rounds}
    />
  );
}
