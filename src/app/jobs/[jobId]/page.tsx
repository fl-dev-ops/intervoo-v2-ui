import { redirect } from "next/navigation";
import { JobDetailClient } from "@/components/jobs/job-detail-client";
import { prisma } from "@/lib/db";
import { deriveFinalDiagnosticReport } from "@/lib/diagnostics/final-report";
import {
  getLatestDiagnosticForJob,
  getOrCreateDiagnosticForJob,
} from "@/lib/diagnostics/jd-progress";
import {
  isDiagnosticRoundReadyForProgression,
  isDiagnosticSessionComplete,
} from "@/lib/diagnostics/rules";
import { getJobDetail, type JobDetail } from "@/lib/jd-client";
import { getDiagnosticPaymentEligibility } from "@/lib/payments";
import { requirePageStage } from "@/lib/stage-guards";

type Props = { params: Promise<{ jobId: string }> };

export default async function JobDetailPage({ params }: Props) {
  const { user } = await requirePageStage(["DIAGNOSTICS", "COMPLETED"]);
  const { jobId } = await params;

  const resume = await prisma.resume.findUnique({
    where: { userId: user.id },
  });

  if (!resume) {
    redirect("/onboarding");
  }

  let diagnostic = await getLatestDiagnosticForJob(user.id, jobId);
  const result = await getJobDetail(jobId);
  const storedJob = getStoredJobDetail(diagnostic?.selectedJob, jobId);
  const job = result.data?.job ?? storedJob;

  if (!job) {
    redirect("/jobs");
  }

  let paymentEligibility = await getDiagnosticPaymentEligibility({
    diagnosticId: diagnostic?.id ?? null,
    jobId,
    userId: user.id,
  });

  if (paymentEligibility.requiresPayment && !diagnostic) {
    diagnostic = await getOrCreateDiagnosticForJob(user.id, job);
    paymentEligibility = await getDiagnosticPaymentEligibility({
      diagnosticId: diagnostic.id,
      jobId,
      userId: user.id,
    });
  }

  const roundsForJob = diagnostic?.rounds ?? [];

  const readyRoundIds = roundsForJob
    .filter((round) =>
      isDiagnosticRoundReadyForProgression({
        session: { report: round.session?.report ?? null },
        status: round.status,
      }),
    )
    .map((round) => round.roundType);

  const readyRoundIdSet = new Set(readyRoundIds);

  // A round whose session finished but whose report is not ready yet (and has not
  // failed) is still generating — surface it instead of letting the user restart.
  const processingRoundIds = roundsForJob
    .filter(
      (round) =>
        isDiagnosticSessionComplete(round.status) &&
        !readyRoundIdSet.has(round.roundType) &&
        (round.session?.report?.status ?? null) !== "FAILED",
    )
    .map((round) => round.roundType);

  const roundScores = Object.fromEntries(
    roundsForJob.map((round) => [
      round.roundType,
      getRoundScore(round.session?.report?.reportJson),
    ]),
  );
  const finalReadinessScore = diagnostic
    ? (deriveFinalDiagnosticReport(diagnostic.rounds)?.overall_score ?? null)
    : null;

  return (
    <JobDetailClient
      job={job}
      readyRoundIds={readyRoundIds}
      processingRoundIds={processingRoundIds}
      roundScores={roundScores}
      diagnosticId={diagnostic?.id ?? null}
      overallScore={finalReadinessScore}
      paymentReason={paymentEligibility.reason}
      requiresPayment={paymentEligibility.requiresPayment}
      user={{ email: user.email ?? null, name: user.name ?? null }}
    />
  );
}

function getStoredJobDetail(
  selectedJob: unknown,
  jobId: string,
): JobDetail | null {
  if (
    !selectedJob ||
    typeof selectedJob !== "object" ||
    Array.isArray(selectedJob)
  ) {
    return null;
  }

  const job = selectedJob as Partial<JobDetail>;

  if (
    job.jobId !== jobId ||
    typeof job.jobTitle !== "string" ||
    typeof job.companyName !== "string" ||
    !Array.isArray(job.rounds)
  ) {
    return null;
  }

  return job as JobDetail;
}

function getRoundScore(reportJson: unknown): number | null {
  if (
    !reportJson ||
    typeof reportJson !== "object" ||
    Array.isArray(reportJson)
  ) {
    return null;
  }

  const assessment = (reportJson as Record<string, unknown>).assessment_result;

  if (
    !assessment ||
    typeof assessment !== "object" ||
    Array.isArray(assessment)
  ) {
    return null;
  }

  const score = (assessment as Record<string, unknown>).total_score;

  return typeof score === "number" ? Math.round(score) : null;
}
