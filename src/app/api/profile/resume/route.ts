import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createResumeDownloadUrl } from "@/lib/s3";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resume = await prisma.resume.findUnique({
    where: { userId: session.user.id },
    select: { resumeUrl: true },
  });
  if (!resume?.resumeUrl) {
    return NextResponse.json({ error: "Resume file not found" }, { status: 404 });
  }

  try {
    const downloadUrl = await createResumeDownloadUrl({
      key: resume.resumeUrl,
      userId: session.user.id,
    });
    return NextResponse.redirect(downloadUrl);
  } catch (error) {
    console.error("Error opening resume:", error);
    return NextResponse.json(
      { error: "Unable to open resume" },
      { status: 500 },
    );
  }
}
