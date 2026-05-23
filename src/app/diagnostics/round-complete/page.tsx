import { redirect } from "next/navigation";
import { RoundCompleteClient } from "@/components/diagnostics/round-complete-client";
import { prisma } from "@/lib/db";
import { DIAGNOSTIC_ROUNDS } from "@/lib/diagnostics/rounds-config";
import { isDiagnosticRoundReadyForProgression } from "@/lib/diagnostics/rules";
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

export default async function DiagnosticsRoundCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { user } = await requirePageStage(["DIAGNOSTICS", "COMPLETED"]);
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    console.info("[diagnostics] redirect", {
      from: "/diagnostics/round-complete",
      reason: "missing_session_id",
      to: "/diagnostics/rounds",
      userId: user.id,
    });
    redirect("/diagnostics/rounds");
  }

  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: { diagnosticRound: true, report: true },
  });

  if (
    !session ||
    session.userId !== user.id ||
    session.type !== "DIAGNOSTIC_ROUND" ||
    !session.diagnosticRound
  ) {
    console.info("[diagnostics] redirect", {
      foundSession: Boolean(session),
      from: "/diagnostics/round-complete",
      reason: "invalid_or_unauthorized_session",
      sessionId,
      to: "/diagnostics/rounds",
      userId: user.id,
    });
    redirect("/diagnostics/rounds");
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

  if (failureReason) {
    console.info("[diagnostics] round complete report failed", {
      failureReason,
      reportErrorMessage,
      roundId: completedRound.roundType,
      sessionId,
      userId: user.id,
    });
  }

  console.info("[diagnostics] round complete state", {
    canStartNext,
    completedRoundNumber: completedRound.roundNumber,
    completedRoundStatus: completedRound.status,
    completedRoundType: completedRound.roundType,
    hasReportJson: Boolean(session.report?.reportJson),
    failureReason,
    nextRound: nextRound?.id ?? null,
    reportStatus,
    sessionId,
    userId: user.id,
  });

  return (
    <RoundCompleteClient
      canStartNext={canStartNext}
      completedRoundId={completedRound.roundType}
      completedRoundNumber={completedRound.roundNumber}
      completedRoundTitle={getRoundDisplayTitle(completedRound.roundType)}
      failureReason={failureReason}
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
