import { redirect } from "next/navigation";
import { CustomPreJoin } from "@/components/prediagnostics/custom-prejoin";
import { prisma } from "@/lib/db";
import {
  getRoundConfig,
  getRoundNumber,
} from "@/lib/diagnostics/rounds-config";
import {
  canStartDiagnosticRound,
  countProgressableDiagnosticRounds,
  shouldShowDiagnosticBandSelection,
} from "@/lib/diagnostics/rules";
import { requirePageStage } from "@/lib/stage-guards";

export default async function DiagnosticsPrejoinPage({
  searchParams,
}: {
  searchParams: Promise<{ round?: string }>;
}) {
  const { round: roundId } = await searchParams;

  const { user } = await requirePageStage(["DIAGNOSTICS"]);

  if (!roundId || !getRoundConfig(roundId)) {
    console.info("[diagnostics] redirect", {
      from: "/diagnostics/prejoin",
      reason: "invalid_round_id",
      roundId: roundId ?? null,
      to: "/diagnostics/rounds",
    });
    redirect("/diagnostics/rounds");
  }

  const diagnostic = await prisma.diagnostic.findFirst({
    where: { userId: user.id },
    include: {
      rounds: {
        include: { session: { include: { report: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!diagnostic || shouldShowDiagnosticBandSelection(diagnostic)) {
    console.info("[diagnostics] redirect", {
      from: "/diagnostics/prejoin",
      reason: "missing_selected_band",
      roundId,
      to: "/diagnostics/selection",
      userId: user.id,
    });
    redirect("/diagnostics/selection");
  }

  const progressableRoundCount = countProgressableDiagnosticRounds(
    diagnostic.rounds,
  );
  const requestedRoundNumber = getRoundNumber(roundId);

  if (
    !canStartDiagnosticRound({
      progressableRoundCount,
      requestedRoundNumber,
    })
  ) {
    console.info(
      "[diagnostics] prejoin blocked because previous report not ready",
      {
        diagnosticId: diagnostic.id,
        progressableRoundCount,
        requestedRoundNumber,
        roundId,
        to: "/diagnostics/rounds",
        userId: user.id,
      },
    );
    redirect("/diagnostics/rounds");
  }

  console.info("[diagnostics] render prejoin", {
    progressableRoundCount,
    requestedRoundNumber,
    roundId,
    userId: user.id,
  });

  return (
    <CustomPreJoin
      flow="diagnostics"
      hideCoachSelection
      roundId={roundId}
      type="video"
      userName={user.name ?? user.email ?? null}
    />
  );
}
