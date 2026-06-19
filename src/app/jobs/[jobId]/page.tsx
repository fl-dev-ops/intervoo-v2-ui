import { redirect } from "next/navigation";
import { JobDetailClient } from "@/components/jobs/job-detail-client";
import { prisma } from "@/lib/db";
import { getLatestDiagnosticForJob } from "@/lib/diagnostics/jd-progress";
import {
  isDiagnosticRoundReadyForProgression,
  isDiagnosticSessionComplete,
} from "@/lib/diagnostics/rules";
import { getJobDetail } from "@/lib/jd-client";
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

  const result = await getJobDetail(jobId);

  if (result.error || !result.data) {
    redirect("/jobs");
  }

  const diagnostic = await getLatestDiagnosticForJob(user.id, jobId);
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

  return (
    <JobDetailClient
      job={result.data.job}
      readyRoundIds={readyRoundIds}
      processingRoundIds={processingRoundIds}
      roundScores={roundScores}
      diagnosticId={diagnostic?.id ?? null}
      user={{ email: user.email ?? null, name: user.name ?? null }}
    />
  );
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
