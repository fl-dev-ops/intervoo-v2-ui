import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  countProgressableDiagnosticRounds,
  isFinalDiagnosticReportReady,
  shouldShowJobSelection,
} from "@/lib/diagnostics/rules";
import { getSelectedJobId } from "@/lib/diagnostics/selected-job";
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
    hasSelectedJob: Boolean(diagnostic?.selectedJob),
    roundSummary: roundSummary ?? [],
  });

  if (!diagnostic || shouldShowJobSelection(diagnostic)) {
    console.info("[diagnostics] render intro", {
      diagnosticId: diagnostic?.id ?? null,
      from: "/diagnostics",
      reason: "missing_selected_job",
      userId: user.id,
    });
    redirect("/jobs");
  }

  const selectedJobId = getSelectedJobId(diagnostic.selectedJob);

  if (!selectedJobId) {
    redirect("/jobs");
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
      hasSelectedJob: Boolean(diagnostic.selectedJob),
      userId: user.id,
    });

    redirect(`/jobs/${selectedJobId}`);
  }

  console.info("[diagnostics] redirect", {
    finalReportReady,
    from: "/diagnostics",
    progressableRounds,
    reason: "selected_job_with_existing_rounds",
    to: `/jobs/${selectedJobId}`,
    userId: user.id,
  });
  redirect(`/jobs/${selectedJobId}`);
}
