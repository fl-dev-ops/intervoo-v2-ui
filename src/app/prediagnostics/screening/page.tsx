import { CustomPreJoin } from "@/components/prediagnostics/custom-prejoin";
import { requirePageStage } from "@/lib/stage-guards";

export default async function PrediagnosticsScreeningPage() {
  await requirePageStage(["PREDIAGNOSTICS"]);

  return <CustomPreJoin type="audio" />;
}
