import { notFound } from "next/navigation";
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
import { getSelectedJobId } from "@/lib/diagnostics/selected-job";
import { getJobDetail } from "@/lib/jd-client";
import { updateUserStage } from "@/lib/progress";
import {
  getHydratedReportFromMetadata,
  toHydratedDiagnosticReport,
} from "@/lib/report-generation/diagnostic";
import type { DiagnosticReportJson } from "@/lib/report-generation/diagnostic-report.types";
import { requirePageStage } from "@/lib/stage-guards";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { stage, user } = await requirePageStage(["DIAGNOSTICS", "COMPLETED"]);

  const diagnostic = await prisma.diagnostic.findFirst({
    where: { id, userId: user.id },
    include: {
      rounds: { include: { session: { include: { report: true } } } },
      user: { include: { resume: true } },
    },
  });

  if (!diagnostic) {
    notFound();
  }

  const bandConfig = getDiagnosticBandConfig(diagnostic.selectedBand);
  const jobId = getSelectedJobId(diagnostic.selectedJob);
  const preferredName = diagnostic.user.resume?.name ?? null;

  const jobResult = jobId ? await getJobDetail(jobId) : null;
  const apiJob = jobResult?.data?.job ?? null;
  const rounds = DIAGNOSTIC_ROUNDS.map((config, index) => {
    const roundNumber = index + 1;
    const dbRound = diagnostic.rounds.find(
      (round) => round.roundNumber === roundNumber,
    );
    const roundReport = dbRound?.session?.report ?? null;
    const askedQuestionCount = getAskedQuestionCount(
      dbRound?.session?.metadata,
    );

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
          talkTimeMinutes: getTalkTimeMinutes(
            dbRound?.session?.startedAt ?? null,
            dbRound?.session?.endedAt ?? null,
          ),
          askedQuestionCount,
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
      talkTimeMinutes: getTalkTimeMinutes(
        dbRound?.session?.startedAt ?? null,
        dbRound?.session?.endedAt ?? null,
      ),
      askedQuestionCount,
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

  console.info("[report] owner report state", {
    allReady,
    diagnosticId: diagnostic.id,
    readyRoundCount: readyRounds.length,
    reportReady: Boolean(report),
    stage,
    userId: user.id,
  });

  if (!readyRounds.length) {
    return (
      <DiagnosticReportPreviewPage
        jobId={jobId}
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
      apiJob={apiJob}
      backHref={jobId ? `/jobs/${jobId}` : "/jobs"}
      backLabel="Back to rounds"
      bandConfig={bandConfig}
      completedRoundCount={readyRounds.length}
      focusedRoundNumber={readyRounds[0]?.roundNumber ?? 1}
      isOwner={true}
      jobId={jobId}
      overallScore={overallScore}
      preferredName={preferredName}
      rounds={rounds}
      user={{ email: user.email ?? null, name: user.name ?? null }}
      resume={{
        name: diagnostic.user.resume?.name ?? null,
        email: diagnostic.user.email ?? null,
        phoneNumber: diagnostic.user.phoneNumber ?? null,
        education: (diagnostic.user.resume?.education ?? []) as Array<{
          degree: string;
          stream: string;
          institution: string;
          graduationYear: string;
          score: string;
        }>,
      }}
    />
  );
}

function getTalkTimeMinutes(startedAt: Date | null, endedAt: Date | null) {
  if (!startedAt || !endedAt) {
    return null;
  }

  const durationMs = endedAt.getTime() - startedAt.getTime();

  if (durationMs <= 0) {
    return null;
  }

  return Math.max(1, Math.round(durationMs / 60_000));
}

function getAskedQuestionCount(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const askedQuestions = (metadata as Record<string, unknown>).asked_questions;
  return Array.isArray(askedQuestions) ? askedQuestions.length : null;
}
