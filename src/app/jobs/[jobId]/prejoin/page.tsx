import { redirect } from "next/navigation";
import { CustomPreJoin } from "@/components/prejoin/custom-prejoin";
import { prisma } from "@/lib/db";
import { getRoundConfig } from "@/lib/diagnostics/rounds-config";
import { canStartDiagnosticRound } from "@/lib/diagnostics/rules";
import { getJobDetail } from "@/lib/jd-client";
import { requirePageStage } from "@/lib/stage-guards";

type Props = {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ round?: string }>;
};

const FIRST_ROUND_ID = "screening";

export default async function JobPrejoinPage({ params, searchParams }: Props) {
  const { user } = await requirePageStage(["DIAGNOSTICS"]);
  const { jobId } = await params;
  const { round } = await searchParams;
  const roundId = round && getRoundConfig(round) ? round : FIRST_ROUND_ID;

  const result = await getJobDetail(jobId);

  if (result.error || !result.data) {
    redirect("/jobs");
  }

  const existingDiagnostic = await prisma.diagnostic.findFirst({
    where: { userId: user.id },
    include: {
      rounds: { include: { session: { include: { report: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const existingRound = existingDiagnostic?.rounds.find(
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

  if (existingDiagnostic) {
    await prisma.diagnostic.update({
      where: { id: existingDiagnostic.id },
      data: {
        selectedBand: null,
        selectedJob: result.data.job as object,
      },
    });
  } else {
    await prisma.diagnostic.create({
      data: {
        userId: user.id,
        selectedBand: null,
        selectedJob: result.data.job as object,
      },
    });
  }

  return (
    <CustomPreJoin
      hideCoachSelection
      roundId={roundId}
      userName={user.name ?? user.email ?? null}
    />
  );
}
