import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { resume: true, progress: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber || "",
      resume: user.resume
        ? {
            name: user.resume.name,
            role: user.resume.role,
            experienceYears: user.resume.experienceYears,
            education: user.resume.education,
            skills: user.resume.skills,
            experience: user.resume.experience,
            projects: user.resume.projects,
          }
        : null,
      stage: user.progress?.stage || "ONBOARDING",
    });
  } catch (error) {
    console.error("Error fetching onboarding data:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
