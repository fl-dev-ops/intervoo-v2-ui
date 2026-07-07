import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPostHogClient } from "@/lib/posthog-server";
import { getUserStage } from "@/lib/progress";
import { upsertResumeForUser } from "@/lib/resume-persistence";
import {
  type OnboardingResumePayload,
  onboardingResumePayloadSchema,
} from "@/lib/resume-schema";
import { isResumeKeyOwnedByUser } from "@/lib/s3";

function getValidationError(body: OnboardingResumePayload) {
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

    const requestBody = onboardingResumePayloadSchema.safeParse(
      await request.json(),
    );
    if (!requestBody.success) {
      return NextResponse.json(
        { error: "Invalid resume data" },
        { status: 400 },
      );
    }
    const body = requestBody.data;

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
      upsertResumeForUser(session.user.id, {
        name,
        role,
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
