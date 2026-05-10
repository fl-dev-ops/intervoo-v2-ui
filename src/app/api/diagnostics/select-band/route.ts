import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  buildDiagnosticJobOptions,
  getDiagnosticJobOption,
  parseDiagnosticBand,
} from "@/lib/diagnostics/job-options";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { band?: unknown };
    const band = parseDiagnosticBand(body.band);

    if (!band) {
      return NextResponse.json(
        { error: "Invalid diagnostic band" },
        { status: 400 },
      );
    }

    const jobOptions = buildDiagnosticJobOptions();
    const selectedJob = getDiagnosticJobOption(jobOptions, band);

    if (!selectedJob) {
      return NextResponse.json(
        { error: "Selected diagnostic job was not found" },
        { status: 400 },
      );
    }

    const existingDiagnostic = await prisma.diagnostic.findFirst({
      where: { userId: session.user.id },
      include: { rounds: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
    });

    if (existingDiagnostic?.rounds.length) {
      return NextResponse.json(
        { error: "Diagnostic band cannot be changed after a round starts" },
        { status: 409 },
      );
    }

    const diagnostic = existingDiagnostic
      ? await prisma.diagnostic.update({
          where: { id: existingDiagnostic.id },
          data: {
            selectedBand: band,
            selectedJob: selectedJob as object,
          },
        })
      : await prisma.diagnostic.create({
          data: {
            userId: session.user.id,
            selectedBand: band,
            selectedJob: selectedJob as object,
          },
        });

    return NextResponse.json({
      diagnosticId: diagnostic.id,
      selectedBand: band,
      selectedJob,
    });
  } catch (error) {
    console.error("Diagnostics select-band error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to select diagnostic band",
      },
      { status: 500 },
    );
  }
}
