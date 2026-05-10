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
      include: { profile: true, progress: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Split full name into first/last
    const nameParts = user.name.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    return NextResponse.json({
      firstName,
      lastName,
      preferredName: user.profile?.preferredName || "",
      email: user.email,
      institution: user.profile?.institution || "",
      degree: user.profile?.degree || "",
      stream: user.profile?.stream || "",
      placementPreparation: user.profile?.placementPreparation || "",
      academySelection: user.profile?.academySelection || "",
      academyName: user.profile?.academyName || "",
      nativeLanguage: user.profile?.nativeLanguage || "",
      englishLevel: user.profile?.englishLevel || "",
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
