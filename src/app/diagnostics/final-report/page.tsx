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

  const bandConfig = getDiagnosticBandConfig(diagnostic.selectedBand);
  const preferredName = diagnostic.user.profile?.preferredName ?? null;
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

  // Earlier attempts (takes) for this user, newest first. Each links to its own
  // public report via any of its ready rounds' share tokens (/d/{token}), which
  // renders that whole attempt scoped to its diagnostic.
  const allAttempts = await prisma.diagnostic.findMany({
    where: { userId: user.id },
    include: {
      rounds: { include: { session: { include: { report: true } } } },
    },
    orderBy: { attemptNumber: "desc" },
  });

  const previousAttempts = allAttempts
    .filter((attempt) => attempt.id !== diagnostic.id)
    .map((attempt) => {
      const readyRounds = attempt.rounds
        .map((round) => {
          const roundReport = round.session?.report ?? null;
          if (!isDiagnosticReportReady(roundReport?.status)) return null;
          const hydrated =
            getHydratedReportFromMetadata(roundReport.metadata) ??
            (roundReport.reportJson
              ? toHydratedDiagnosticReport(roundReport.reportJson)
              : null);
          return hydrated && roundReport.shareToken
            ? {
                score: hydrated.assessment_result.total_score,
                shareToken: roundReport.shareToken,
              }
            : null;
        })
        .filter((entry): entry is { score: number; shareToken: string } =>
          Boolean(entry),
        );

      if (readyRounds.length === 0) return null;

      return {
        attemptNumber: attempt.attemptNumber,
        overallScore: Math.round(
          readyRounds.reduce((sum, entry) => sum + entry.score, 0) /
            readyRounds.length,
        ),
        viewToken: readyRounds[0].shareToken,
        completedAt: (attempt.updatedAt ?? attempt.createdAt).toISOString(),
      };
    })
    .filter((attempt): attempt is NonNullable<typeof attempt> =>
      Boolean(attempt),
    );

  return (
    <PublicDiagnosticReport
      attemptNumber={diagnostic.attemptNumber}
      backHref="/diagnostics/rounds"
      backLabel="Back to rounds"
      bandConfig={bandConfig}
      canRetake={allReady}
      focusedRoundNumber={readyRounds[0]?.roundNumber ?? 1}
      isOwner={true}
      overallScore={overallScore}
      preferredName={preferredName}
      previousAttempts={previousAttempts}
      rounds={rounds}
      user={{ email: user.email ?? null, name: user.name ?? null }}
    />
  );
}
