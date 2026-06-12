import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isFinalDiagnosticReportReady } from "@/lib/diagnostics/rules";
import { getUserStage, updateUserStage } from "@/lib/progress";

export async function POST() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const stage = await getUserStage(userId);

    if (stage !== "DIAGNOSTICS" && stage !== "COMPLETED") {
      console.info("[diagnostics] retake rejected", {
        reason: "invalid_stage",
        stage,
        userId,
      });
      return NextResponse.json(
        { error: "Diagnostics are not available for this user stage" },
        { status: 409 },
      );
    }

    // The latest attempt is the one being retaken; it must be fully complete so
    // that the previous attempt is preserved as a finished "take".
    const latest = await prisma.diagnostic.findFirst({
      where: { userId },
      include: {
        rounds: { include: { session: { include: { report: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!latest || !latest.selectedBand) {
      console.info("[diagnostics] retake rejected", {
        diagnosticId: latest?.id ?? null,
        reason: "no_completable_diagnostic",
        userId,
      });
      return NextResponse.json(
        { error: "No completed diagnostic was found to retake" },
        { status: 409 },
      );
    }

    if (!isFinalDiagnosticReportReady(latest.rounds)) {
      console.info("[diagnostics] retake rejected", {
        diagnosticId: latest.id,
        reason: "rounds_not_complete",
        userId,
      });
      return NextResponse.json(
        { error: "Complete all rounds before starting a new attempt" },
        { status: 409 },
      );
    }

    const highest = await prisma.diagnostic.findFirst({
      where: { userId },
      orderBy: { attemptNumber: "desc" },
      select: { attemptNumber: true },
    });

    const nextAttemptNumber = (highest?.attemptNumber ?? 0) + 1;

    // A retake is a brand-new Diagnostic; the previous attempt (rounds,
    // sessions, reports, finalReport) stays intact and becomes "Take N-1".
    const diagnostic = await prisma.diagnostic.create({
      data: {
        userId,
        selectedBand: latest.selectedBand,
        selectedJob: (latest.selectedJob as object) ?? undefined,
        attemptNumber: nextAttemptNumber,
        status: "IN_PROGRESS",
        currentRound: 1,
      },
    });

    // Re-open diagnostics so the user can start rounds on the new attempt.
    if (stage !== "DIAGNOSTICS") {
      await updateUserStage(userId, "DIAGNOSTICS");
    }

    console.info("[diagnostics] retake created", {
      attemptNumber: nextAttemptNumber,
      diagnosticId: diagnostic.id,
      previousDiagnosticId: latest.id,
      userId,
    });

    return NextResponse.json({
      diagnosticId: diagnostic.id,
      attemptNumber: nextAttemptNumber,
    });
  } catch (error) {
    console.error("Diagnostics retake error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to start a retake",
      },
      { status: 500 },
    );
  }
}
