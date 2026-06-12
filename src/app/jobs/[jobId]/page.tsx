import { redirect } from "next/navigation";
import { JobDetailClient } from "@/components/jobs/job-detail-client";
import { prisma } from "@/lib/db";
import { isDiagnosticRoundReadyForProgression } from "@/lib/diagnostics/rules";
import { getSelectedJobId } from "@/lib/diagnostics/selected-job";
import { getJobDetail } from "@/lib/jd-client";
import { requirePageStage } from "@/lib/stage-guards";

type Props = { params: Promise<{ jobId: string }> };

export default async function JobDetailPage({ params }: Props) {
  const { user } = await requirePageStage(["DIAGNOSTICS"]);
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

  const diagnostic = await prisma.diagnostic.findFirst({
    where: { userId: user.id },
    include: {
      rounds: {
        include: { session: { include: { report: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const readyRoundIds =
    getSelectedJobId(diagnostic?.selectedJob) === jobId
      ? diagnostic?.rounds
          .filter((round) =>
            isDiagnosticRoundReadyForProgression({
              session: { report: round.session?.report ?? null },
              status: round.status,
            }),
          )
          .map((round) => round.roundType) ?? []
      : [];

  return (
    <JobDetailClient
      job={result.data.job}
      readyRoundIds={readyRoundIds}
      diagnosticId={diagnostic?.id ?? null}
      user={{ email: user.email ?? null, name: user.name ?? null }}
    />
  );
}
