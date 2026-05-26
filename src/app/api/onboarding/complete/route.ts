import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPostHogClient } from "@/lib/posthog-server";
import { getUserStage } from "@/lib/progress";

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
  coach: "string",
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function getValidationError(body: Record<string, string>) {
  if (!body.firstName?.trim()) return "First name is required";
  if (!EMAIL_PATTERN.test(body.email?.trim() ?? "")) {
    return "A valid email address is required";
  }
  if (!body.degree?.trim()) return "Highest qualification is required";
  if (!body.stream?.trim()) return "Stream or branch is required";
  if (!body.institution?.trim()) return "College name is required";
  if (!body.placementPreparation?.trim()) {
    return "Placement preparation mode is required";
  }
  if (!body.nativeLanguage?.trim()) return "Comfort language is required";
  if (!body.englishLevel?.trim()) return "English level is required";
  if (body.coach && body.coach !== "Sara" && body.coach !== "arjun") {
    return "Coach selection is invalid";
  }
  if (
    body.placementPreparation === "training_academy" &&
    !body.academySelection?.trim()
  ) {
    return "Academy selection is required";
  }
  if (
    body.placementPreparation === "training_academy" &&
    body.academySelection === "Others" &&
    !body.academyName?.trim()
  ) {
    return "Academy name is required";
  }

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
        { error: "Invalid onboarding data" },
        { status: 400 },
      );
    }

    const validationError = getValidationError(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
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
      coach,
    } = body;
    const displayName = preferredName.trim() || firstName.trim();
    const selectedCoach = coach === "arjun" ? "arjun" : "Sara";

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
          preferredName: displayName,
          institution,
          degree,
          stream,
          placementPreparation,
          academySelection,
          academyName,
          nativeLanguage: nativeLanguage || "",
          englishLevel: englishLevel || "",
          coach: selectedCoach,
          speakingSpeed: "",
          yearOfStudy: "",
        },
        update: {
          preferredName: displayName,
          institution,
          degree,
          stream,
          placementPreparation,
          academySelection,
          academyName,
          nativeLanguage: nativeLanguage || "",
          englishLevel: englishLevel || "",
          coach: selectedCoach,
          speakingSpeed: "",
          yearOfStudy: "",
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
        name: `${firstName} ${lastName}`.trim(),
        email,
        phone_number: session.user.phoneNumber,
        institution,
        degree,
        native_language: nativeLanguage,
        english_level: englishLevel,
        placement_preparation: placementPreparation,
        coach: selectedCoach,
      },
    });
    posthog.capture({
      distinctId: session.user.id,
      event: "onboarding_completed",
      properties: {
        native_language: nativeLanguage,
        english_level: englishLevel,
        placement_preparation: placementPreparation,
        coach: selectedCoach,
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
