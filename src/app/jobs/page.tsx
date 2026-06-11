import { redirect } from "next/navigation";
import { JobsClient } from "@/components/jobs/jobs-client";
import { prisma } from "@/lib/db";
import { searchJobs, type SearchInput } from "@/lib/jd-client";
import { requirePageStage } from "@/lib/stage-guards";

type ResumeProject = { title?: unknown; description?: unknown };

export default async function JobsPage() {
  const { user } = await requirePageStage(["DIAGNOSTICS"]);
  const resume = await prisma.resume.findUnique({
    where: { userId: user.id },
  });

  if (!resume) {
    redirect("/onboarding");
  }

  const initialSearch = buildSearchInput({
    experienceYears: resume.experienceYears,
    projects: resume.projects,
    role: resume.role,
    skills: resume.skills,
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

function buildSearchInput({
  experienceYears,
  projects,
  role,
  skills,
}: {
  experienceYears: number | null;
  projects: unknown;
  role: string;
  skills: string[];
}): SearchInput {
  return {
    companyText: "",
    experienceYears,
    projectTexts: getProjectTexts(projects),
    roleText: role,
    skillNames: skills,
    sort: "score",
  };
}

function getProjectTexts(projects: unknown) {
  if (!Array.isArray(projects)) return [];

  return projects
    .map((project: ResumeProject) =>
      [project.title, project.description]
        .filter((value): value is string => typeof value === "string")
        .join(" - "),
    )
    .filter(Boolean);
}
