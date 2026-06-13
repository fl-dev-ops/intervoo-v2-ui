import { redirect } from "next/navigation";
import { JobsClient } from "@/components/jobs/jobs-client";
import { prisma } from "@/lib/db";
import { getSelectedJobId } from "@/lib/diagnostics/selected-job";
import {
  isDiagnosticRoundReadyForProgression,
  isDiagnosticSessionComplete,
} from "@/lib/diagnostics/rules";
import { buildResumeSearchInput } from "@/lib/diagnostics/search-input";
import { requirePageStage } from "@/lib/stage-guards";

export default async function JobsPage() {
  const { user } = await requirePageStage(["DIAGNOSTICS"]);
  const resume = await prisma.resume.findUnique({
    where: { userId: user.id },
  });

  if (!resume) {
    redirect("/onboarding");
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

  const selectedJobId = getSelectedJobId(diagnostic?.selectedJob);
  const hasStartedJob =
    Boolean(selectedJobId) &&
    (diagnostic?.rounds ?? []).some((round) => {
      const isReady = isDiagnosticRoundReadyForProgression({
        session: { report: round.session?.report ?? null },
        status: round.status,
      });

      const isProcessing =
        isDiagnosticSessionComplete(round.status) &&
        !isReady &&
        (round.session?.report?.status ?? null) !== "FAILED";

      return isReady || isProcessing;
    });

  if (selectedJobId && hasStartedJob) {
    redirect(`/jobs/${selectedJobId}`);
  }

  const initialSearch = buildResumeSearchInput({
    role: resume.role,
    experienceYears: resume.experienceYears,
    skills: resume.skills,
    projects: resume.projects,
    skillGlosses: resume.skillGlosses,
    projectKeywords: resume.projectKeywords,
    projectCapabilities: resume.projectCapabilities,
    workInitiatives: resume.workInitiatives,
  });

  return (
    <JobsClient
      initialCards={[]}
      initialError={null}
      initialSearch={initialSearch}
      user={{ email: user.email ?? null, name: user.name ?? null }}
    />
  );
}
