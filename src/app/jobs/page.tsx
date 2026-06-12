import { redirect } from "next/navigation";
import { JobsClient } from "@/components/jobs/jobs-client";
import { prisma } from "@/lib/db";
import { buildResumeSearchInput } from "@/lib/diagnostics/search-input";
import { searchJobs } from "@/lib/jd-client";
import { requirePageStage } from "@/lib/stage-guards";

export default async function JobsPage() {
  const { user } = await requirePageStage(["DIAGNOSTICS"]);
  const resume = await prisma.resume.findUnique({
    where: { userId: user.id },
  });

  if (!resume) {
    redirect("/onboarding");
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
  const result = await searchJobs(initialSearch);

  return (
    <JobsClient
      initialCards={result.data?.cards ?? []}
      initialError={result.error}
      initialSearch={initialSearch}
      user={{ email: user.email ?? null, name: user.name ?? null }}
    />
  );
}
