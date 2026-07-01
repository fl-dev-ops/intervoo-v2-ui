import { redirect } from "next/navigation";
import { JobsClient, type StartedJobCard } from "@/components/jobs/jobs-client";
import { prisma } from "@/lib/db";
import { getUserDiagnosticsWithRounds } from "@/lib/diagnostics/jd-progress";
import { DIAGNOSTIC_ROUNDS } from "@/lib/diagnostics/rounds-config";
import {
  isDiagnosticRoundReadyForProgression,
  isDiagnosticSessionComplete,
} from "@/lib/diagnostics/rules";
import { buildResumeSearchInput } from "@/lib/diagnostics/search-input";
import { getSelectedJobId } from "@/lib/diagnostics/selected-job";
import type { JobDetail } from "@/lib/jd-client";
import { requirePageStage } from "@/lib/stage-guards";

export default async function JobsPage() {
  const { user } = await requirePageStage(["DIAGNOSTICS", "COMPLETED"]);
  const resume = await prisma.resume.findUnique({
    where: { userId: user.id },
  });

  if (!resume) {
    redirect("/onboarding");
  }

  const diagnostics = await getUserDiagnosticsWithRounds(user.id);
  const startedJobs = getStartedJobCards(diagnostics);

  const initialSearch = buildResumeSearchInput({
    role: resume.role,
    experienceYears: resume.experienceYears,
    skills: resume.skills,
    experience: resume.experience,
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
      startedJobs={startedJobs}
      user={{ email: user.email ?? null, name: user.name ?? null }}
    />
  );
}

function getStartedJobCards(
  diagnostics: Awaited<ReturnType<typeof getUserDiagnosticsWithRounds>>,
) {
  const jobs = new Map<string, StartedJobCard>();

  for (const diagnostic of diagnostics) {
    if (!diagnostic.rounds.length) continue;

    const jobId = getSelectedJobId(diagnostic.selectedJob);
    if (!jobId || jobs.has(jobId)) continue;

    const job = diagnostic.selectedJob as Partial<JobDetail>;
    if (!job.jobTitle || !job.companyName) continue;

    jobs.set(jobId, {
      companyName: job.companyName,
      experienceMaxYears: job.experienceMaxYears ?? null,
      experienceMinYears: job.experienceMinYears ?? null,
      jobId,
      jobTitle: job.jobTitle,
      roundProgress: DIAGNOSTIC_ROUNDS.map((round) => {
        const progress = diagnostic.rounds.find(
          (candidate) => candidate.roundType === round.id,
        );
        const reportStatus = progress?.session?.report?.status ?? null;

        let state: StartedJobCard["roundProgress"][number]["state"] =
          "not-started";

        if (progress) {
          if (isDiagnosticRoundReadyForProgression(progress)) {
            state = "completed";
          } else if (reportStatus === "FAILED") {
            state = "failed";
          } else if (isDiagnosticSessionComplete(progress.status)) {
            state = "generating";
          } else {
            state = "started";
          }
        }

        return {
          id: round.id,
          state,
          title: round.title,
        };
      }),
    });
  }

  return [...jobs.values()];
}
