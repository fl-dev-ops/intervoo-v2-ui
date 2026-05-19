import { PrediagnosticsIntro } from "@/components/prediagnostics/prediagnostics-intro";
import type { CoachOption } from "@/lib/coaches";
import { prisma } from "@/lib/db";
import { isValidPrediagnosticRetryCode } from "@/lib/prediagnostics/retry-code";
import { requirePageStage } from "@/lib/stage-guards";

export default async function PrediagnosticsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const retryCode = typeof params.code === "string" ? params.code : null;
  const isRetry = isValidPrediagnosticRetryCode(retryCode);
  const { user } = await requirePageStage(
    isRetry ? ["PREDIAGNOSTICS", "DIAGNOSTICS"] : ["PREDIAGNOSTICS"],
  );
  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { coach: true, preferredName: true },
  });

  return (
    <PrediagnosticsIntro
      coach={toCoachOption(profile?.coach)}
      name={profile?.preferredName ?? user.name}
      retryCode={isRetry ? retryCode : null}
    />
  );
}

function toCoachOption(value: string | null | undefined): CoachOption | null {
  return value === "sana" || value === "arjun" ? value : null;
}
