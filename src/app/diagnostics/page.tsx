import { redirect } from "next/navigation";
import { DiagnosticsIntro } from "@/components/diagnostics/diagnostics-intro";
import type { CoachOption } from "@/lib/coaches";
import { prisma } from "@/lib/db";
import {
  countProgressableDiagnosticRounds,
  isFinalDiagnosticReportReady,
  shouldShowDiagnosticBandSelection,
} from "@/lib/diagnostics/rules";
import { requirePageStage } from "@/lib/stage-guards";

export default async function DiagnosticsPage() {
  const { user } = await requirePageStage(["DIAGNOSTICS", "COMPLETED"]);

  const diagnostic = await prisma.diagnostic.findFirst({
    where: { userId: user.id },
    include: {
      user: { include: { profile: true } },
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

  const progressableRounds = countProgressableDiagnosticRounds(
    diagnostic.rounds,
  );

  const finalReportReady = isFinalDiagnosticReportReady(diagnostic.rounds);

  if (finalReportReady) {
    console.info("[diagnostics] redirect", {
      from: "/diagnostics",
      progressableRounds,
      reason: "final_report_ready",
      to: "/diagnostics/final-report",
      userId: user.id,
    });
    redirect("/diagnostics/final-report");
  }

  if (diagnostic.rounds.length === 0) {
    console.info("[diagnostics] render intro", {
      diagnosticId: diagnostic.id,
      selectedBand: diagnostic.selectedBand,
      userId: user.id,
    });

    const profile = diagnostic.user.profile;
    const coach =
      profile?.coach === "arjun" || profile?.coach === "sana"
        ? (profile.coach as CoachOption)
        : null;

    return (
      <DiagnosticsIntro
        coach={coach}
        name={profile?.preferredName || user.name || null}
      />
    );
  }

  console.info("[diagnostics] redirect", {
    finalReportReady,
    from: "/diagnostics",
    progressableRounds,
    reason: "selected_band_with_existing_rounds",
    to: "/diagnostics/rounds",
    userId: user.id,
  });
  redirect("/diagnostics/rounds");
}
