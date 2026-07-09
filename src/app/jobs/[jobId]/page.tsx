import { redirect } from "next/navigation";
import { JobDetailClient } from "@/components/jobs/job-detail-client";
import {
  getLatestDiagnosticSummaryForJob,
  getOrCreateDiagnosticForJob,
} from "@/lib/diagnostics/jd-progress";
import { getJobDetail, type JobDetail } from "@/lib/jd-client";
import { getDiagnosticPaymentEligibility } from "@/lib/payments";
import { requirePageStage } from "@/lib/stage-guards";

type Props = { params: Promise<{ jobId: string }> };

export default async function JobDetailPage({ params }: Props) {
  const { jobId } = await params;

  const jobDetailPromise = getJobDetail(jobId);
  const { user } = await requirePageStage(["DIAGNOSTICS", "COMPLETED"]);
  const [result, initialDiagnostic] = await Promise.all([
    jobDetailPromise,
    getLatestDiagnosticSummaryForJob(user.id, jobId),
  ]);
  let diagnostic = initialDiagnostic;

  const storedJob = getStoredJobDetail(diagnostic?.selectedJob, jobId);
  const job = result.data?.job ?? storedJob;

  if (!job) {
    redirect("/jobs");
  }

  // Reuse the diagnostic we already loaded instead of re-querying it.
  let paymentEligibility = await getDiagnosticPaymentEligibility({
    diagnostic: diagnostic
      ? { id: diagnostic.id, paidAt: diagnostic.paidAt }
      : null,
    jobId,
    userId: user.id,
  });

  if (paymentEligibility.requiresPayment && !diagnostic) {
    diagnostic = await getOrCreateDiagnosticForJob(user.id, job);
    paymentEligibility = await getDiagnosticPaymentEligibility({
      diagnostic: { id: diagnostic.id, paidAt: diagnostic.paidAt },
      jobId,
      userId: user.id,
    });
  }

  return (
    <JobDetailClient
      job={job}
      readyRoundIds={[]}
      processingRoundIds={[]}
      roundScores={{}}
      diagnosticId={diagnostic?.id ?? null}
      overallScore={null}
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
