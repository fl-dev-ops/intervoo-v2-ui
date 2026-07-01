import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  buildResumeAnalysisInput,
  buildResumeSearchInput,
  hasCandidateAnalysisEvidence,
} from "@/lib/diagnostics/search-input";
import { getJobMatch } from "@/lib/jd-client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resume = await prisma.resume.findUnique({
      where: { userId: session.user.id },
    });

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const resumeSource = {
      role: resume.role,
      experienceYears: resume.experienceYears,
      skills: resume.skills,
      experience: resume.experience,
      projects: resume.projects,
      skillGlosses: resume.skillGlosses,
      projectKeywords: resume.projectKeywords,
      projectCapabilities: resume.projectCapabilities,
      workInitiatives: resume.workInitiatives,
    };
    const searchInput = buildResumeSearchInput(resumeSource);
    const hasAnalysisEvidence = hasCandidateAnalysisEvidence(
      buildResumeAnalysisInput(resumeSource),
    );
    const hasMatchEvidence =
      searchInput.skills?.some((skill) => skill.name.trim().length > 0) ||
      searchInput.projectTexts?.some((text) => text.trim().length > 0) ||
      false;

    if (!hasMatchEvidence) {
      return NextResponse.json({
        match: { score: null, skillsPct: null, projectsPct: null },
        hasAnalysisEvidence,
      });
    }

    const { jobId } = await params;
    const result = await getJobMatch(jobId, {
      skills: searchInput.skills,
      skillNames: searchInput.skillNames,
      projectTexts: searchInput.projectTexts,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json({ ...result.data, hasAnalysisEvidence });
  } catch (error) {
    console.error("Job match error:", error);
    return NextResponse.json(
      { error: "Failed to load job match" },
      { status: 500 },
    );
  }
}
