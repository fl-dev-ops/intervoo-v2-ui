import { redirect } from "next/navigation";
import { JobsClient } from "@/components/jobs/jobs-client";
import { prisma } from "@/lib/db";
import { getInProgressDiagnosticForUser } from "@/lib/diagnostics/jd-progress";
import { buildResumeSearchInput } from "@/lib/diagnostics/search-input";
import { getSelectedJobId } from "@/lib/diagnostics/selected-job";
import { requirePageStage } from "@/lib/stage-guards";

export default async function JobsPage() {
  const { user } = await requirePageStage(["DIAGNOSTICS", "COMPLETED"]);
  const resume = await prisma.resume.findUnique({
    where: { userId: user.id },
  });

  if (!resume) {
    redirect("/onboarding");
  }

  const diagnostic = await getInProgressDiagnosticForUser(user.id);
  const selectedJobId = getSelectedJobId(diagnostic?.selectedJob);

  if (selectedJobId) {
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
