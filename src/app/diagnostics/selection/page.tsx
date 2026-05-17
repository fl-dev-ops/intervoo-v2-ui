import { redirect } from "next/navigation";
import { DiagnosticsSelectionClient } from "@/components/diagnostics/selection-client";
import { prisma } from "@/lib/db";
import { buildDiagnosticJobOptions } from "@/lib/diagnostics/job-options";
import {
  countCompletedDiagnosticRounds,
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

  const completedRounds = existingDiagnostic
    ? countCompletedDiagnosticRounds(existingDiagnostic.rounds)
    : 0;

  console.info("[diagnostics] selection page state", {
    bandLocked: isDiagnosticBandLocked(existingDiagnostic),
    completedRounds,
    diagnosticId: existingDiagnostic?.id ?? null,
    hasRounds: Boolean(existingDiagnostic?.rounds.length),
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

  // Fetch latest pre-diagnostic report for dream job & salary data
  const preDiagnosticSession = await prisma.interviewSession.findFirst({
    where: { userId: user.id, type: "PREDIAGNOSTIC" },
    include: { report: true },
    orderBy: { createdAt: "desc" },
  });

  const reportJson = preDiagnosticSession?.report?.reportJson;
  const dreamRole =
    typeof reportJson === "object" && reportJson !== null
      ? ((reportJson as Record<string, unknown>).dream_job ??
        (reportJson as Record<string, unknown>).aiming_for)
      : null;
  const targetSalary =
    typeof reportJson === "object" && reportJson !== null
      ? (reportJson as Record<string, unknown>).salary_expectation
      : null;

  const options = buildDiagnosticJobOptions();

  console.info("[diagnostics] render selection", {
    defaultBand: existingDiagnostic?.selectedBand ?? null,
    dreamRole,
    optionCount: options.length,
    targetSalary,
    userId: user.id,
  });

  return (
    <DiagnosticsSelectionClient
      dreamRole={typeof dreamRole === "string" ? dreamRole : null}
      initialBand={existingDiagnostic?.selectedBand ?? null}
      options={options}
      targetSalary={typeof targetSalary === "string" ? targetSalary : null}
      user={{ email: user.email ?? null, name: user.name ?? null }}
    />
  );
}
