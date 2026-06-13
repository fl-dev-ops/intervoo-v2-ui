import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
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
      include: { resume: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      name: user.name || "",
      email: user.email || "",
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
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, role, experienceYears, education, skills, experience, projects } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

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
          role: role?.trim() || "",
          experienceYears: experienceYears ?? null,
          education: education ?? [],
          skills: skills ?? [],
          experience: experience ?? [],
          projects: projects ?? [],
        },
        update: {
          name: name.trim(),
          role: role?.trim() || "",
          experienceYears: experienceYears ?? null,
          education: education ?? [],
          skills: skills ?? [],
          experience: experience ?? [],
          projects: projects ?? [],
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
