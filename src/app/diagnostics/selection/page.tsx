import { redirect } from "next/navigation";
import { DiagnosticsSelectionClient } from "@/components/diagnostics/selection-client";
import { prisma } from "@/lib/db";
import { buildDiagnosticJobOptions } from "@/lib/diagnostics/job-options";
import {
  countProgressableDiagnosticRounds,
  isDiagnosticBandLocked,
  isFinalDiagnosticReportReady,
} from "@/lib/diagnostics/rules";
import { requirePageStage } from "@/lib/stage-guards";

export default async function DiagnosticsSelectionPage() {
  const { user } = await requirePageStage(["DIAGNOSTICS"]);

  const existingDiagnostic = await prisma.diagnostic.findFirst({
    where: { userId: user.id },
    include: {
      rounds: { include: { session: { include: { report: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const progressableRounds = existingDiagnostic
    ? countProgressableDiagnosticRounds(existingDiagnostic.rounds)
    : 0;

  console.info("[diagnostics] selection page state", {
    bandLocked: isDiagnosticBandLocked(existingDiagnostic),
    diagnosticId: existingDiagnostic?.id ?? null,
    hasRounds: Boolean(existingDiagnostic?.rounds.length),
    progressableRounds,
    selectedBand: existingDiagnostic?.selectedBand ?? null,
    userId: user.id,
  });

  if (
    existingDiagnostic &&
    isFinalDiagnosticReportReady(existingDiagnostic.rounds)
  ) {
    console.info("[diagnostics] redirect", {
      from: "/diagnostics/selection",
      reason: "all_round_reports_ready",
      to: "/diagnostics/final-report",
      userId: user.id,
    });
    redirect("/diagnostics/final-report");
  }

  if (isDiagnosticBandLocked(existingDiagnostic)) {
    console.info("[diagnostics] redirect", {
      from: "/diagnostics/selection",
      reason: "band_locked_by_completed_report",
      roundCount: existingDiagnostic?.rounds.length ?? 0,
      to: "/diagnostics/rounds",
      userId: user.id,
    });
    redirect("/diagnostics/rounds");
  }

  // TODO: Add target role and salary context here when the new onboarding data exists.

  const options = buildDiagnosticJobOptions();

  console.info("[diagnostics] render selection", {
    defaultBand: existingDiagnostic?.selectedBand ?? null,
    optionCount: options.length,
    userId: user.id,
  });

  return (
    <DiagnosticsSelectionClient
      initialBand={existingDiagnostic?.selectedBand ?? null}
      options={options}
      user={{ email: user.email ?? null, name: user.name ?? null }}
    />
  );
}
