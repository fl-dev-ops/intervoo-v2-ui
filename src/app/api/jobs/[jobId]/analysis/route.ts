import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildResumeAnalysisInput } from "@/lib/diagnostics/search-input";
import { analyzeJobFit, type JobMatch } from "@/lib/jd-client";

export async function POST(
  request: Request,
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

    const body = (await request.json().catch(() => ({}))) as {
      match?: JobMatch | null;
    };
    const { jobId } = await params;
    const match = body.match ?? null;
    const result = await analyzeJobFit(jobId, {
      ...buildResumeAnalysisInput({
        role: resume.role,
        experienceYears: resume.experienceYears,
        skills: resume.skills,
        experience: resume.experience,
        projects: resume.projects,
        skillGlosses: resume.skillGlosses,
        projectKeywords: resume.projectKeywords,
        projectCapabilities: resume.projectCapabilities,
        workInitiatives: resume.workInitiatives,
      }),
      overallPct: match?.score ?? null,
      skillsPct: match?.skillsPct ?? null,
      projectsPct: match?.projectsPct ?? null,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Job fit analysis error:", error);
    return NextResponse.json(
      { error: "Failed to load job fit analysis" },
      { status: 500 },
    );
  }
}
