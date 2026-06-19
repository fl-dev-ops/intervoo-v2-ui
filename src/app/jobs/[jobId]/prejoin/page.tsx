import { redirect } from "next/navigation";
import { CustomPreJoin } from "@/components/prejoin/custom-prejoin";
import {
  getLockedDiagnosticForUser,
  getOrCreateDiagnosticForJob,
} from "@/lib/diagnostics/jd-progress";
import { getRoundConfig } from "@/lib/diagnostics/rounds-config";
import { canStartDiagnosticRound } from "@/lib/diagnostics/rules";
import { getSelectedJobId } from "@/lib/diagnostics/selected-job";
import { getJobDetail } from "@/lib/jd-client";
import { requirePageStage } from "@/lib/stage-guards";

type Props = {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ round?: string }>;
};

const FIRST_ROUND_ID = "screening";

export default async function JobPrejoinPage({ params, searchParams }: Props) {
  const { user } = await requirePageStage(["DIAGNOSTICS", "COMPLETED"]);
  const { jobId } = await params;
  const { round } = await searchParams;
  const roundId = round && getRoundConfig(round) ? round : FIRST_ROUND_ID;

  const result = await getJobDetail(jobId);

  if (result.error || !result.data) {
    redirect("/jobs");
  }

  const inProgressDiagnostic = await getLockedDiagnosticForUser(user.id);
  const inProgressJobId = getSelectedJobId(inProgressDiagnostic?.selectedJob);

  if (inProgressDiagnostic && inProgressJobId && inProgressJobId !== jobId) {
    redirect(`/jobs/${inProgressJobId}`);
  }

  const diagnostic = await getOrCreateDiagnosticForJob(
    user.id,
    result.data.job,
  );

  const existingRound = diagnostic.rounds.find(
    (round) => round.roundType === roundId,
  );

  if (
    existingRound &&
    !canStartDiagnosticRound({
      reportStartedAt: existingRound.session?.report?.startedAt ?? null,
      reportStatus: existingRound.session?.report?.status ?? null,
      roundType: existingRound.roundType,
      startedAt: existingRound.session?.startedAt ?? null,
      status: existingRound.status,
    })
  ) {
    redirect(`/jobs/${jobId}`);
  }

  return (
    <CustomPreJoin
      diagnosticId={diagnostic.id}
      hideCoachSelection
      roundId={roundId}
      userName={user.name ?? user.email ?? null}
    />
  );
}
