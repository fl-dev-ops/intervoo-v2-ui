import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DiagnosticsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/login");
  }

  const diagnostic = await prisma.diagnostic.findFirst({
    where: { userId: session.user.id },
    include: {
      rounds: {
        select: { status: true },
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

  const allRoundsDone = completedRounds === 4;
  const finalReportReady =
    allRoundsDone && diagnostic.finalReport && diagnostic.finalReportShareToken;

  if (finalReportReady) {
    redirect("/diagnostics/final-report");
  }

  // Some rounds done, or all done but final report not ready.
  redirect("/diagnostics/rounds");
}
