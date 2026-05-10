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
    redirect("/diagnostics/rounds");
  }

  return <CustomPreJoin flow="diagnostics" roundId={roundId} type="video" />;
}
