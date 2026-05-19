import { PrediagnosticsPreJoin } from "@/components/prediagnostics/prediagnostics-prejoin";
import { isValidPrediagnosticRetryCode } from "@/lib/prediagnostics/retry-code";
import { requirePageStage } from "@/lib/stage-guards";

export default async function PrediagnosticsScreeningPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const retryCode = typeof params.code === "string" ? params.code : null;
  const isRetry = isValidPrediagnosticRetryCode(retryCode);
  await requirePageStage(
    isRetry ? ["PREDIAGNOSTICS", "DIAGNOSTICS"] : ["PREDIAGNOSTICS"],
  );

  return <PrediagnosticsPreJoin retryCode={isRetry ? retryCode : null} />;
}
