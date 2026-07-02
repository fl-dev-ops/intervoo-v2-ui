import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPostHogClient } from "@/lib/posthog-server";
import { getUserStage } from "@/lib/progress";
import { isResumeKeyOwnedByUser } from "@/lib/s3";

type EducationEntry = {
  degree: string;
  stream: string;
  institution: string;
  graduationYear: string;
  score: string;
};

type ExperienceEntry = {
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  description: string;
};

type ProjectEntry = {
  title: string;
  description: string;
};

type ResumePayload = {
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  experienceYears: number | null;
  education: EducationEntry[];
  skills: string[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  // Rich matching fields (optional; absent for manually-built profiles).
  skillGlosses?: Record<string, string>;
  projectKeywords?: string[][];
  projectCapabilities?: string[][];
  workInitiatives?: string[][];
  resumeUrl?: string;
};

function validateBody(body: unknown): body is ResumePayload {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;

  if (typeof b.name !== "string") return false;
  if (typeof b.email !== "string") return false;
  if (typeof b.phoneNumber !== "string") return false;
  if (typeof b.role !== "string") return false;
  if (b.experienceYears !== null && typeof b.experienceYears !== "number")
    return false;
  if (!Array.isArray(b.education)) return false;
  if (!Array.isArray(b.skills)) return false;
  if (!Array.isArray(b.experience)) return false;
  if (!Array.isArray(b.projects)) return false;
  if (b.resumeUrl !== undefined && typeof b.resumeUrl !== "string") {
    return false;
  }

  return true;
}

function getValidationError(body: ResumePayload) {
  if (!body.name.trim()) return "Name is required";
  if (!body.email.trim()) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()))
    return "A valid email address is required";
  if (!body.phoneNumber.trim()) return "Phone number is required";
  if (!/^[+\d][\d\s()-]{7,}$/.test(body.phoneNumber.trim()))
    return "A valid phone number is required";

  return "";
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stage = await getUserStage(session.user.id);
    if (stage !== "ONBOARDING") {
      return NextResponse.json(
        { error: "Onboarding is already complete" },
        { status: 409 },
      );
    }

    const body = (await request.json()) as unknown;

    if (!validateBody(body)) {
      return NextResponse.json(
        { error: "Invalid resume data" },
        { status: 400 },
      );
    }

    const validationError = getValidationError(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const {
      name,
      email,
      phoneNumber,
      role,
      experienceYears,
      education,
      skills,
      experience,
      projects,
      resumeUrl,
    } = body;
    if (resumeUrl && !isResumeKeyOwnedByUser(resumeUrl, session.user.id)) {
      return NextResponse.json(
        { error: "Invalid resume file" },
        { status: 400 },
      );
    }
    const skillGlosses = body.skillGlosses ?? {};
    const projectKeywords = body.projectKeywords ?? [];
    const projectCapabilities = body.projectCapabilities ?? [];
    const workInitiatives = body.workInitiatives ?? [];

    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          name: name.trim(),
          email: email.trim(),
        },
      }),
      prisma.resume.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          name: name.trim(),
          role: role.trim(),
          experienceYears,
          education,
          skills,
          experience,
          projects,
          skillGlosses,
          projectKeywords,
          projectCapabilities,
          workInitiatives,
          resumeUrl,
        },
        update: {
          name: name.trim(),
          role: role.trim(),
          experienceYears,
          education,
          skills,
          experience,
          projects,
          skillGlosses,
          projectKeywords,
          projectCapabilities,
          workInitiatives,
          resumeUrl,
        },
      }),
      prisma.userProgress.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          stage: "DIAGNOSTICS",
          onboardingCompletedAt: new Date(),
        },
        update: {
          stage: "DIAGNOSTICS",
          onboardingCompletedAt: new Date(),
        },
      }),
    ]);

    const posthog = getPostHogClient();
    posthog.identify({
      distinctId: session.user.id,
      properties: {
        name: name.trim(),
        email: email.trim(),
        phone_number: phoneNumber.trim() || null,
        role: role.trim(),
        experience_years: experienceYears,
        skills_count: skills.length,
      },
    });
    posthog.capture({
      distinctId: session.user.id,
      event: "onboarding_completed",
      properties: {
        role: role.trim(),
        experience_years: experienceYears,
        skills_count: skills.length,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding completion error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
