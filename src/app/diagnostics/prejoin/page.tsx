import { redirect } from "next/navigation";
import { CustomPreJoin } from "@/components/prediagnostics/custom-prejoin";
import { getRoundConfig } from "@/lib/diagnostics/rounds-config";
import { requirePageStage } from "@/lib/stage-guards";

export default async function DiagnosticsPrejoinPage({
  searchParams,
}: {
  searchParams: Promise<{ round?: string }>;
}) {
  const { round: roundId } = await searchParams;

  await requirePageStage(["DIAGNOSTICS"]);

  if (!roundId || !getRoundConfig(roundId)) {
    console.info("[diagnostics] redirect", {
      from: "/diagnostics/prejoin",
      reason: "invalid_round_id",
      roundId: roundId ?? null,
      to: "/diagnostics/rounds",
    });
    redirect("/diagnostics/rounds");
  }

  console.info("[diagnostics] render prejoin", { roundId });

  return (
    <CustomPreJoin
      flow="diagnostics"
      hideCoachSelection
      roundId={roundId}
      type="video"
    />
  );
}
