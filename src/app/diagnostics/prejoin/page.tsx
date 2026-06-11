import { redirect } from "next/navigation";
import { CustomPreJoin } from "@/components/prejoin/custom-prejoin";
import { prisma } from "@/lib/db";
import { getRoundConfig } from "@/lib/diagnostics/rounds-config";
import {
  canStartDiagnosticRound,
  shouldShowJobSelection,
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

  if (!diagnostic || shouldShowJobSelection(diagnostic)) {
    console.info("[diagnostics] redirect", {
      from: "/diagnostics/prejoin",
      reason: "missing_selected_job",
      roundId,
      to: "/jobs",
      userId: user.id,
    });
    redirect("/jobs");
  }

  const existingRound = diagnostic.rounds.find(
    (round) => round.roundType === roundId,
  );

  if (
    !canStartDiagnosticRound(
      existingRound
        ? {
            reportStartedAt: existingRound.session?.report?.startedAt ?? null,
            reportStatus: existingRound.session?.report?.status ?? null,
            roundType: existingRound.roundType,
            startedAt: existingRound.session?.startedAt ?? null,
            status: existingRound.status,
          }
        : undefined,
    )
  ) {
    console.info("[diagnostics] prejoin blocked because round is unavailable", {
      diagnosticId: diagnostic.id,
      reportStatus: existingRound?.session?.report?.status ?? null,
      roundId,
      roundStatus: existingRound?.status ?? null,
      to: "/diagnostics/rounds",
      userId: user.id,
    });
    redirect("/diagnostics/rounds");
  }

  console.info("[diagnostics] render prejoin", {
    roundId,
    userId: user.id,
  });

  return (
    <CustomPreJoin
      hideCoachSelection
      roundId={roundId}
      userName={user.name ?? user.email ?? null}
    />
  );
}
