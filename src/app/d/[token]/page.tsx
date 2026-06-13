import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PublicDiagnosticReport } from "@/components/diagnostics/public-diagnostic-report";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDiagnosticBandConfig } from "@/lib/diagnostics/bands-config";
import { DIAGNOSTIC_ROUNDS } from "@/lib/diagnostics/rounds-config";
import {
  isDiagnosticReportReady,
  isDiagnosticRoundStuckOrFailed,
} from "@/lib/diagnostics/rules";
import { getSelectedJobId } from "@/lib/diagnostics/selected-job";
import { getJobDetail } from "@/lib/jd-client";
import {
  getHydratedReportFromMetadata,
  toHydratedDiagnosticReport,
} from "@/lib/report-generation/diagnostic";
import type { DiagnosticReportJson } from "@/lib/report-generation/diagnostic-report.types";

export default async function PublicDiagnosticReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const seedReport = await prisma.report.findUnique({
    where: { shareToken: token },
    include: {
      session: {
        include: {
          diagnosticRound: {
            include: {
              diagnostic: {
                include: {
                  user: { include: { resume: true } },
                  rounds: {
                    orderBy: { roundNumber: "asc" },
                    include: {
                      session: {
                        include: { report: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!seedReport) {
    notFound();
  }

  const diagnostic = seedReport.session.diagnosticRound?.diagnostic;
  if (!diagnostic) {
    notFound();
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const isOwner = session?.user?.id === diagnostic.userId;

  const bandConfig = getDiagnosticBandConfig(diagnostic.selectedBand);
  const jobId = getSelectedJobId(diagnostic.selectedJob);
  const preferredName = diagnostic.user.resume?.name ?? null;

  const jobResult = jobId ? await getJobDetail(jobId) : null;
  const apiJob = jobResult?.data?.job ?? null;

  // Build round data for all 4 configured rounds
  const rounds = DIAGNOSTIC_ROUNDS.map((config, index) => {
    const roundNumber = index + 1;
    const dbRound = diagnostic.rounds.find(
      (r) => r.roundNumber === roundNumber,
    );
    const report = dbRound?.session?.report ?? null;
    const askedQuestionCount = getAskedQuestionCount(
      dbRound?.session?.metadata,
    );

    if (isDiagnosticReportReady(report?.status)) {
      const hydrated =
        getHydratedReportFromMetadata(report.metadata) ??
        (report.reportJson
          ? toHydratedDiagnosticReport(report.reportJson)
          : null);
      if (hydrated) {
        return {
          roundNumber,
          roundType: config.id,
          roundTitle: config.title,
          hasReport: true as const,
          shareToken: report.shareToken ?? null,
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
      shareToken: report?.shareToken ?? null,
      talkTimeMinutes: getTalkTimeMinutes(
        dbRound?.session?.startedAt ?? null,
        dbRound?.session?.endedAt ?? null,
      ),
      askedQuestionCount,
      report: null,
      isFailed,
    };
  });

  const readyRounds = rounds.filter((r) => r.hasReport);
  const allReady = readyRounds.length === 4;

  const overallScore = allReady
    ? Math.round(
        readyRounds.reduce(
          (sum, r) => sum + r.report.assessment_result.total_score,
          0,
        ) / 4,
      )
    : null;

  // Determine which round to focus on load: the one matching the URL token,
  // or the first available round.
  const focusedRoundNumber =
    rounds.find((r) => r.shareToken === token)?.roundNumber ??
    readyRounds[0]?.roundNumber ??
    1;

  console.info("[diagnostics] public report state", {
    diagnosticId: diagnostic.id,
    focusedRoundNumber,
    isOwner,
    readyRoundCount: readyRounds.length,
    token,
  });

  return (
    <PublicDiagnosticReport
      apiJob={apiJob}
      bandConfig={bandConfig}
      backHref={jobId ? `/jobs/${jobId}` : "/jobs"}
      backLabel="Back to rounds"
      focusedRoundNumber={focusedRoundNumber}
      isOwner={isOwner}
      jobId={jobId}
      overallScore={overallScore}
      preferredName={preferredName}
      rounds={rounds}
      user={
        session?.user
          ? {
              email: session.user.email ?? null,
              name: session.user.name ?? null,
            }
          : undefined
      }
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
