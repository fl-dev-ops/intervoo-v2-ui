import { redirect } from "next/navigation";
import { JobDetailClient } from "@/components/jobs/job-detail-client";
import { prisma } from "@/lib/db";
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

  return (
    <JobDetailClient
      job={result.data.job}
      user={{ email: user.email ?? null, name: user.name ?? null }}
    />
  );
}
