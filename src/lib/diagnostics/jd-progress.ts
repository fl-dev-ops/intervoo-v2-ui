import { prisma } from "@/lib/db";
import { areAllDiagnosticRoundsComplete } from "@/lib/diagnostics/rules";
import { getSelectedJobId } from "@/lib/diagnostics/selected-job";
import type { JobDetail } from "@/lib/jd-client";

const diagnosticWithRounds = {
  rounds: {
    include: { session: { include: { report: true } } },
    orderBy: { roundNumber: "asc" as const },
  },
} as const;

export type DiagnosticWithRounds = Awaited<
  ReturnType<typeof getUserDiagnosticsWithRounds>
>[number];

export function isDiagnosticPracticeComplete(
  diagnostic: Pick<DiagnosticWithRounds, "rounds"> | null | undefined,
) {
  return areAllDiagnosticRoundsComplete(diagnostic?.rounds ?? []);
}

export function isDiagnosticPracticeInProgress(
  diagnostic: Pick<DiagnosticWithRounds, "rounds"> | null | undefined,
) {
  const rounds = diagnostic?.rounds ?? [];
  return rounds.length > 0 && !areAllDiagnosticRoundsComplete(rounds);
}

export async function getUserDiagnosticsWithRounds(userId: string) {
  return prisma.diagnostic.findMany({
    where: { userId },
    include: diagnosticWithRounds,
    orderBy: { createdAt: "desc" },
  });
}

export async function getInProgressDiagnosticForUser(userId: string) {
  const diagnostics = await getUserDiagnosticsWithRounds(userId);
  return (
    diagnostics.find((diagnostic) =>
      isDiagnosticPracticeInProgress(diagnostic),
    ) ?? null
  );
}

export async function getLatestDiagnosticForJob(userId: string, jobId: string) {
  const diagnostics = await getUserDiagnosticsWithRounds(userId);
  return (
    diagnostics.find(
      (diagnostic) => getSelectedJobId(diagnostic.selectedJob) === jobId,
    ) ?? null
  );
}

export async function getOrCreateDiagnosticForJob(
  userId: string,
  job: JobDetail,
) {
  const existing = await getLatestDiagnosticForJob(userId, job.jobId);

  if (existing) {
    return existing;
  }

  return prisma.diagnostic.create({
    data: {
      userId,
      selectedBand: null,
      selectedJob: job as unknown as object,
    },
    include: diagnosticWithRounds,
  });
}
