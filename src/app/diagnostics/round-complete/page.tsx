import { redirect } from "next/navigation";
import { RoundCompleteClient } from "@/components/diagnostics/round-complete-client";
import { prisma } from "@/lib/db";
import { DIAGNOSTIC_ROUNDS } from "@/lib/diagnostics/rounds-config";
import { isDiagnosticSessionComplete } from "@/lib/diagnostics/rules";
import { requirePageStage } from "@/lib/stage-guards";

const ROUND_DISPLAY_TITLES: Record<string, string> = {
  behavioural: "Behavioural",
  "career-readiness": "Career readiness",
  screening: "Screening",
  "technical-thinking": "Technical",
};

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
    include: { diagnosticRound: true },
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
  const canStartNext = isDiagnosticSessionComplete(completedRound.status);

  console.info("[diagnostics] round complete state", {
    canStartNext,
    completedRoundNumber: completedRound.roundNumber,
    completedRoundStatus: completedRound.status,
    completedRoundType: completedRound.roundType,
    nextRound: nextRound?.id ?? null,
    sessionId,
    userId: user.id,
  });

  return (
    <RoundCompleteClient
      canStartNext={canStartNext}
      completedRoundTitle={getRoundDisplayTitle(completedRound.roundType)}
      nextRound={
        nextRound
          ? { id: nextRound.id, roundNumber: completedRound.roundNumber + 1 }
          : null
      }
    />
  );
}

function getRoundDisplayTitle(roundType: string) {
  return ROUND_DISPLAY_TITLES[roundType] ?? "diagnostic";
}
