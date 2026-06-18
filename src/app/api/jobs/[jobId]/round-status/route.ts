import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLatestDiagnosticForJob } from "@/lib/diagnostics/jd-progress";
import {
  isDiagnosticRoundReadyForProgression,
  isDiagnosticSessionComplete,
} from "@/lib/diagnostics/rules";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await params;
    const diagnostic = await getLatestDiagnosticForJob(session.user.id, jobId);
    const roundsForJob = diagnostic?.rounds ?? [];

    const readyRoundIds = roundsForJob
      .filter((round) =>
        isDiagnosticRoundReadyForProgression({
          session: { report: round.session?.report ?? null },
          status: round.status,
        }),
      )
      .map((round) => round.roundType);

    const readyRoundIdSet = new Set(readyRoundIds);
    const processingRoundIds = roundsForJob
      .filter(
        (round) =>
          isDiagnosticSessionComplete(round.status) &&
          !readyRoundIdSet.has(round.roundType) &&
          (round.session?.report?.status ?? null) !== "FAILED",
      )
      .map((round) => round.roundType);

    const roundScores = Object.fromEntries(
      roundsForJob.map((round) => [
        round.roundType,
        getRoundScore(round.session?.report?.reportJson),
      ]),
    );

    return NextResponse.json({
      processingRoundIds,
      readyRoundIds,
      roundScores,
    });
  } catch (error) {
    console.error("Job round status error:", error);
    return NextResponse.json(
      { error: "Failed to load round status" },
      { status: 500 },
    );
  }
}

function getRoundScore(reportJson: unknown): number | null {
  if (
    !reportJson ||
    typeof reportJson !== "object" ||
    Array.isArray(reportJson)
  ) {
    return null;
  }

  const assessment = (reportJson as Record<string, unknown>).assessment_result;

  if (
    !assessment ||
    typeof assessment !== "object" ||
    Array.isArray(assessment)
  ) {
    return null;
  }

  const score = (assessment as Record<string, unknown>).total_score;

  return typeof score === "number" ? Math.round(score) : null;
}
