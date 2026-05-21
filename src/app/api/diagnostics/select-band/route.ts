import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  buildDiagnosticJobOptions,
  getDiagnosticJobOption,
  parseDiagnosticBand,
} from "@/lib/diagnostics/job-options";
import { canChangeDiagnosticBand } from "@/lib/diagnostics/rules";
import { getUserStage } from "@/lib/progress";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stage = await getUserStage(session.user.id);
    console.info("[diagnostics] select-band request", {
      stage,
      userId: session.user.id,
    });
    if (stage !== "DIAGNOSTICS") {
      console.info("[diagnostics] select-band rejected", {
        reason: "invalid_stage",
        stage,
        userId: session.user.id,
      });
      return NextResponse.json(
        { error: "Diagnostics are not available for this user stage" },
        { status: 409 },
      );
    }

    const body = (await request.json()) as { band?: unknown };
    const band = parseDiagnosticBand(body.band);

    if (!band) {
      console.info("[diagnostics] select-band rejected", {
        rawBand: body.band,
        reason: "invalid_band",
        userId: session.user.id,
      });
      return NextResponse.json(
        { error: "Invalid diagnostic band" },
        { status: 400 },
      );
    }

    const jobOptions = buildDiagnosticJobOptions();
    const selectedJob = getDiagnosticJobOption(jobOptions, band);

    if (!selectedJob) {
      console.info("[diagnostics] select-band rejected", {
        band,
        reason: "missing_selected_job",
        userId: session.user.id,
      });
      return NextResponse.json(
        { error: "Selected diagnostic job was not found" },
        { status: 400 },
      );
    }

    const existingDiagnostic = await prisma.diagnostic.findFirst({
      where: { userId: session.user.id },
      include: {
        rounds: { include: { session: { include: { report: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    const existingRoundCount = existingDiagnostic?.rounds.length ?? 0;

    if (!canChangeDiagnosticBand(existingDiagnostic?.rounds ?? [])) {
      console.info("[diagnostics] select-band rejected", {
        diagnosticId: existingDiagnostic?.id ?? null,
        reason: "round_report_record_exists",
        roundCount: existingRoundCount,
        userId: session.user.id,
      });
      return NextResponse.json(
        { error: "Diagnostic band cannot be changed after starting a round" },
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

    console.info("[diagnostics] select-band saved", {
      band,
      diagnosticId: diagnostic.id,
      selectedJob: selectedJob.title,
      userId: session.user.id,
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
