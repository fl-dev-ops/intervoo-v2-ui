import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const onboardingSchema = {
  firstName: "string",
  lastName: "string",
  preferredName: "string",
  email: "string",
  institution: "string",
  degree: "string",
  stream: "string",
  placementPreparation: "string",
  academySelection: "string",
  academyName: "string",
  nativeLanguage: "string",
  englishLevel: "string",
} as const;

function validateBody(body: unknown): body is Record<string, string> {
  if (typeof body !== "object" || body === null) return false;

  for (const key of Object.keys(onboardingSchema)) {
    const value = (body as Record<string, unknown>)[key];
    // Allow empty strings for optional fields
    if (value !== undefined && typeof value !== "string") {
      return false;
    }
  }

  return true;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as unknown;

    if (!validateBody(body)) {
      return NextResponse.json(
        { error: "Invalid onboarding data" },
        { status: 400 },
      );
    }

    const {
      firstName,
      lastName,
      preferredName,
      email,
      institution,
      degree,
      stream,
      placementPreparation,
      academySelection,
      academyName,
      nativeLanguage,
      englishLevel,
    } = body;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          name: `${firstName} ${lastName}`.trim(),
          email,
        },
      }),
      prisma.profile.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          preferredName,
          institution,
          degree,
          stream,
          placementPreparation,
          academySelection,
          academyName,
          nativeLanguage: nativeLanguage || "",
          englishLevel: englishLevel || "",
          speakingSpeed: "",
          yearOfStudy: "",
        },
        update: {
          preferredName,
          institution,
          degree,
          stream,
          placementPreparation,
          academySelection,
          academyName,
          nativeLanguage: nativeLanguage || "",
          englishLevel: englishLevel || "",
          speakingSpeed: "",
          yearOfStudy: "",
        },
      }),
      prisma.userProgress.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          stage: "PREDIAGNOSTICS",
          onboardingCompletedAt: new Date(),
        },
        update: {
          stage: "PREDIAGNOSTICS",
          onboardingCompletedAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding completion error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
