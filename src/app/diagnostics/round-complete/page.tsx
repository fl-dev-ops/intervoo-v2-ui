import { redirect } from "next/navigation";
import { RoundCompleteClient } from "@/components/diagnostics/round-complete-client";
import { prisma } from "@/lib/db";
import { DIAGNOSTIC_ROUNDS } from "@/lib/diagnostics/rounds-config";
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
    redirect("/diagnostics/rounds");
  }

  const completedRound = session.diagnosticRound;
  const nextRound = DIAGNOSTIC_ROUNDS[completedRound.roundNumber] ?? null;
  const canStartNext =
    completedRound.status === "COMPLETED" ||
    completedRound.status === "REPORT_READY";

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
