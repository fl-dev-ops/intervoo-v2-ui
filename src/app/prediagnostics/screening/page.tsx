import { PrediagnosticsPreJoin } from "@/components/prediagnostics/prediagnostics-prejoin";
import { requirePageStage } from "@/lib/stage-guards";

export default async function PrediagnosticsScreeningPage() {
  await requirePageStage(["PREDIAGNOSTICS"]);

  return <PrediagnosticsPreJoin />;
}
