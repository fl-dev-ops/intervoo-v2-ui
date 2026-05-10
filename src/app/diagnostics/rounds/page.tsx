import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DiagnosticsRoundsClient } from "@/components/diagnostics/rounds-client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  buildDiagnosticJobOptions,
  getDiagnosticJobOption,
  parseDiagnosticBand,
} from "@/lib/diagnostics/job-options";

export default async function DiagnosticsRoundsPage() {
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
        include: {
          session: {
            include: { report: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!diagnostic?.selectedBand) {
    redirect("/diagnostics/selection");
  }

  const jobOptions = buildDiagnosticJobOptions();
  const selectedBand = parseDiagnosticBand(diagnostic.selectedBand);
  const selectedJob = getDiagnosticJobOption(jobOptions, selectedBand);

  if (!selectedJob) {
    redirect("/diagnostics/selection");
  }

  const rounds = diagnostic.rounds.map((round) => ({
    id: round.id,
    roundType: round.roundType,
    roundNumber: round.roundNumber,
    status: round.status,
    sessionId: round.sessionId,
    reportStatus: round.session?.report?.status ?? null,
    reportShareToken: round.session?.report?.shareToken ?? null,
  }));

  const completedCount = rounds.filter(
    (r) => r.status === "COMPLETED" || r.status === "REPORT_READY",
  ).length;

  const allCompleted = completedCount === 4;
  const reportsReadyCount = rounds.filter(
    (round) => round.reportStatus === "READY" && round.reportShareToken,
  ).length;

  return (
    <DiagnosticsRoundsClient
      diagnostic={{
        id: diagnostic.id,
        status: diagnostic.status,
        finalReport: diagnostic.finalReport,
        finalReportShareToken: diagnostic.finalReportShareToken,
      }}
      initialRounds={rounds}
      selectedJob={selectedJob}
      allCompleted={allCompleted}
      completedCount={completedCount}
      reportsReadyCount={reportsReadyCount}
    />
  );
}
