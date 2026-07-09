import { prisma } from "@/lib/db";
import {
  areAllDiagnosticRoundsComplete,
  countProgressableDiagnosticRounds,
} from "@/lib/diagnostics/rules";
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

export function isDiagnosticPracticeLockedToJob(
  diagnostic: Pick<DiagnosticWithRounds, "rounds"> | null | undefined,
) {
  const rounds = diagnostic?.rounds ?? [];
  return (
    countProgressableDiagnosticRounds(rounds) > 0 &&
    !areAllDiagnosticRoundsComplete(rounds)
  );
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

export async function getLockedDiagnosticForUser(userId: string) {
  const diagnostics = await getUserDiagnosticsWithRounds(userId);
  return (
    diagnostics.find((diagnostic) =>
      isDiagnosticPracticeLockedToJob(diagnostic),
    ) ?? null
  );
}

export async function getLatestDiagnosticForJob(userId: string, jobId: string) {
  // Filter by the `selectedJob.jobId` JSON path in the query so the DB returns
  // only this job's diagnostic — instead of loading every diagnostic (with all
  // rounds + full report blobs) and filtering in JS.
  return prisma.diagnostic.findFirst({
    where: {
      userId,
      selectedJob: { path: ["jobId"], equals: jobId },
    },
    include: diagnosticWithRounds,
    orderBy: { createdAt: "desc" },
  });
}

export async function getLatestDiagnosticSummaryForJob(
  userId: string,
  jobId: string,
) {
  return prisma.diagnostic.findFirst({
    where: {
      userId,
      selectedJob: { path: ["jobId"], equals: jobId },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      paidAt: true,
      selectedJob: true,
    },
  });
}

export async function getLatestDiagnosticRoundStatusForJob(
  userId: string,
  jobId: string,
) {
  return prisma.diagnostic.findFirst({
    where: {
      userId,
      selectedJob: { path: ["jobId"], equals: jobId },
    },
    orderBy: { createdAt: "desc" },
    select: {
      rounds: {
        orderBy: { roundNumber: "asc" },
        select: {
          roundType: true,
          status: true,
          session: {
            select: {
              report: {
                select: {
                  metadata: true,
                  reportJson: true,
                  status: true,
                },
              },
            },
          },
        },
      },
    },
  });
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
