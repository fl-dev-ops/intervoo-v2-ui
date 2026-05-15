import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePageStage } from "@/lib/stage-guards";

export default async function DiagnosticsPage() {
  const { user } = await requirePageStage(["DIAGNOSTICS", "COMPLETED"]);

  const diagnostic = await prisma.diagnostic.findFirst({
    where: { userId: user.id },
    include: {
      rounds: {
        include: { session: { include: { report: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // No diagnostic choice yet -> selection page.
  if (!diagnostic?.selectedBand) {
    redirect("/diagnostics/selection");
  }

  const completedRounds = diagnostic.rounds.filter(
    (r) => r.status === "COMPLETED" || r.status === "REPORT_READY",
  ).length;

  const finalReportReady =
    completedRounds === 4 &&
    diagnostic.rounds.every(
      (round) => round.session?.report?.status === "READY",
    );

  if (finalReportReady) {
    redirect("/diagnostics/final-report");
  }

  // Some rounds done, or all done but final report not ready.
  redirect("/diagnostics/rounds");
}
