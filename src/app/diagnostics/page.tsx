import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  countCompletedDiagnosticRounds,
  isDiagnosticBandLocked,
  isFinalDiagnosticReportReady,
  shouldShowDiagnosticBandSelection,
} from "@/lib/diagnostics/rules";
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

  const roundSummary = diagnostic?.rounds.map((round) => ({
    roundNumber: round.roundNumber,
    roundType: round.roundType,
    status: round.status,
    reportStatus: round.session?.report?.status ?? null,
  }));

  console.info("[diagnostics] route state", {
    userId: user.id,
    diagnosticId: diagnostic?.id ?? null,
    selectedBand: diagnostic?.selectedBand ?? null,
    roundSummary: roundSummary ?? [],
  });

  // No diagnostic choice yet -> selection page.
  if (!diagnostic || shouldShowDiagnosticBandSelection(diagnostic)) {
    console.info("[diagnostics] redirect", {
      from: "/diagnostics",
      reason: "missing_selected_band",
      to: "/diagnostics/selection",
      userId: user.id,
    });
    redirect("/diagnostics/selection");
  }

  const completedRounds = countCompletedDiagnosticRounds(diagnostic.rounds);

  const finalReportReady = isFinalDiagnosticReportReady(diagnostic.rounds);

  if (finalReportReady) {
    console.info("[diagnostics] redirect", {
      completedRounds,
      from: "/diagnostics",
      reason: "final_report_ready",
      to: "/diagnostics/final-report",
      userId: user.id,
    });
    redirect("/diagnostics/final-report");
  }

  if (!isDiagnosticBandLocked(diagnostic)) {
    console.info("[diagnostics] redirect", {
      completedRounds,
      finalReportReady,
      from: "/diagnostics",
      reason: "band_not_locked",
      to: "/diagnostics/selection",
      userId: user.id,
    });
    redirect("/diagnostics/selection");
  }

  console.info("[diagnostics] redirect", {
    completedRounds,
    finalReportReady,
    from: "/diagnostics",
    reason: "band_locked_by_completed_report",
    to: "/diagnostics/rounds",
    userId: user.id,
  });
  redirect("/diagnostics/rounds");
}
