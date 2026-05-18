import { PrediagnosticsIntro } from "@/components/prediagnostics/prediagnostics-intro";
import type { CoachOption } from "@/lib/coaches";
import { prisma } from "@/lib/db";
import { requirePageStage } from "@/lib/stage-guards";

export default async function PrediagnosticsPage() {
  const { user } = await requirePageStage(["PREDIAGNOSTICS"]);
  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { coach: true, preferredName: true },
  });

  return (
    <PrediagnosticsIntro
      coach={toCoachOption(profile?.coach)}
      name={profile?.preferredName ?? user.name}
    />
  );
}

function toCoachOption(value: string | null | undefined): CoachOption | null {
  return value === "sana" || value === "arjun" ? value : null;
}
