import { redirect } from "next/navigation";
import { RoundCompleteClient } from "@/components/diagnostics/round-complete-client";
import { prisma } from "@/lib/db";
import { DIAGNOSTIC_ROUNDS } from "@/lib/diagnostics/rounds-config";
import { isDiagnosticRoundReadyForProgression } from "@/lib/diagnostics/rules";
import type { JobDetail } from "@/lib/jd-client";
import { requirePageStage } from "@/lib/stage-guards";

const ROUND_DISPLAY_TITLES: Record<string, string> = {
  behavioural: "Behavioural",
  "career-readiness": "Career readiness",
  screening: "Screening",
  "technical-thinking": "Technical",
};

const INSUFFICIENT_SPEECH_PATTERNS = [
  "no relevant answers were provided",
  "no transcript is available",
  "no relevant answers",
] as const;

export default async function SessionCompletedPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { user } = await requirePageStage(["DIAGNOSTICS", "COMPLETED"]);
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    redirect("/jobs");
  }

  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: {
      diagnosticRound: {
        include: { diagnostic: true },
      },
      report: true,
    },
  });

  if (
    !session ||
    session.userId !== user.id ||
    session.type !== "DIAGNOSTIC_ROUND" ||
    !session.diagnosticRound
  ) {
    redirect("/jobs");
  }

  const selectedJob = session.diagnosticRound.diagnostic.selectedJob as
    | JobDetail
    | null;
  const jobId = selectedJob?.jobId ?? null;

  if (!jobId) {
    redirect("/jobs");
  }

  const completedRound = session.diagnosticRound;
  const nextRound = DIAGNOSTIC_ROUNDS[completedRound.roundNumber] ?? null;
  const reportStatus = session.report?.status ?? null;
  const reportErrorMessage = session.report?.errorMessage ?? null;
  const failureReason =
    reportStatus === "FAILED"
      ? getReportFailureReason(reportErrorMessage)
      : null;
  const canStartNext = isDiagnosticRoundReadyForProgression({
    session: { report: session.report },
    status: completedRound.status,
  });

  return (
    <RoundCompleteClient
      canStartNext={canStartNext}
      completedRoundId={completedRound.roundType}
      completedRoundNumber={completedRound.roundNumber}
      completedRoundTitle={getRoundDisplayTitle(completedRound.roundType)}
      failureReason={failureReason}
      jobId={jobId}
      nextRound={
        nextRound
          ? { id: nextRound.id, roundNumber: completedRound.roundNumber + 1 }
          : null
      }
      reportErrorMessage={reportErrorMessage}
      reportStatus={reportStatus}
    />
  );
}

function getRoundDisplayTitle(roundType: string) {
  return ROUND_DISPLAY_TITLES[roundType] ?? "diagnostic";
}

function getReportFailureReason(errorMessage: string | null) {
  const normalized = errorMessage?.toLowerCase() ?? "";
  return INSUFFICIENT_SPEECH_PATTERNS.some((pattern) =>
    normalized.includes(pattern),
  )
    ? "insufficient_speech"
    : "generation_failed";
}
