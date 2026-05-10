import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateUserStage } from "@/lib/progress";
import { generateReport } from "@/lib/report-generation/generate-report";
import { buildDiagnosticRubric } from "@/lib/report-generation/rubrics";
import { buildReportTranscriptPromptText } from "@/lib/report-generation/transcript";
import { createUniquePublicReportToken } from "@/lib/report-share";
import { buildPublicReportUrl } from "@/lib/share-token";
import { sendWhatsAppReportLink } from "@/lib/twilio";

const FinalDiagnosticReportSchema = z.object({
  overall_score: z.number(),
  thinking_avg: z.number(),
  language_avg: z.number(),
  confidence_avg: z.number(),
  salary_lpa: z.number(),
  salary_band: z.string(),
  salary_percentile: z.number(),
  holistic_strengths: z.array(z.string()).min(1).max(5),
  holistic_improvements: z.array(z.string()).min(1).max(5),
  round_summaries: z.array(
    z.object({
      roundId: z.string(),
      thinking_level: z.string(),
      confidence_level: z.string(),
      language_avg: z.number(),
      strengths: z.array(z.string()),
      improvements: z.array(z.string()),
    }),
  ),
  education_summary: z.string(),
  aspiration_statement: z.string(),
  reality_statement: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { diagnosticId?: string };

    if (!body.diagnosticId) {
      return NextResponse.json(
        { error: "Missing diagnosticId" },
        { status: 400 },
      );
    }

    const diagnostic = await prisma.diagnostic.findUnique({
      where: { id: body.diagnosticId },
      include: {
        rounds: {
          include: {
            session: {
              include: { report: true },
            },
          },
        },
        user: { include: { profile: true } },
      },
    });

    if (!diagnostic || diagnostic.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Diagnostic not found" },
        { status: 404 },
      );
    }

    // Check if all rounds have ready reports
    const readyRounds = diagnostic.rounds.filter(
      (r) => r.session?.report?.status === "READY",
    );

    if (readyRounds.length < 4) {
      return NextResponse.json(
        { error: "Not all round reports are ready" },
        { status: 409 },
      );
    }

    // Check if final report already exists
    if (diagnostic.finalReport && diagnostic.finalReportShareToken) {
      return NextResponse.json({
        status: "READY",
        shareToken: diagnostic.finalReportShareToken,
      });
    }

    // Build combined transcript and round summaries
    const roundSummaries = readyRounds.map((round) => {
      const report = round.session?.report?.reportJson as Record<
        string,
        unknown
      > | null;
      const assessment = report?.assessment_result as Record<
        string,
        unknown
      > | null;
      const languageLevels = assessment?.language_levels as Record<
        string,
        unknown
      > | null;
      const hydratedLanguageAverage = assessment?.language_avg;

      return {
        roundId: round.roundType,
        thinking_level: (assessment?.thinking_level as string) ?? "N/A",
        confidence_level: (assessment?.confidence_level as string) ?? "N/A",
        language_avg:
          typeof hydratedLanguageAverage === "number"
            ? hydratedLanguageAverage
            : getLanguageAverage(languageLevels),
        strengths: (report?.strengths as string[]) ?? [],
        improvements: (report?.improvement_areas as string[]) ?? [],
      };
    });

    const combinedTranscript = readyRounds
      .map((round) => {
        const transcriptText = buildReportTranscriptPromptText(
          round.session?.transcript,
        );
        return `--- ${round.roundType.toUpperCase()} ROUND ---\n${transcriptText}`;
      })
      .join("\n\n");

    const profile = diagnostic.user.profile;
    const participantName =
      profile?.preferredName || diagnostic.user.name || "Learner";

    const prompt = `${buildDiagnosticRubric({
      participantName,
      transcriptPromptText: combinedTranscript,
    })}

This is a FINAL AGGREGATED REPORT based on 4 diagnostic rounds.

Round summaries:
${JSON.stringify(roundSummaries, null, 2)}

Synthesize all 4 rounds into a single holistic assessment. Provide an overall score (0-100), averaged dimensions, salary band, and combined strengths/improvements.`;

    const reportJson = await generateReport({
      prompt,
      schema: FinalDiagnosticReportSchema,
      system:
        "You are a senior interview coach synthesizing multiple diagnostic round evaluations into a single holistic report. Be thorough but concise.",
    });

    const shareToken = await createUniquePublicReportToken();

    await prisma.diagnostic.update({
      where: { id: diagnostic.id },
      data: {
        finalReport: reportJson as object,
        finalReportShareToken: shareToken,
        status: "COMPLETED",
      },
    });

    await updateUserStage(diagnostic.userId, "COMPLETED");
    await prisma.userProgress.updateMany({
      where: { userId: diagnostic.userId },
      data: { diagnosticsCompletedAt: new Date() },
    });

    try {
      const user = await prisma.user.findUnique({
        where: { id: diagnostic.userId },
        select: { name: true, phoneNumber: true },
      });

      if (user?.phoneNumber) {
        const baseUrl = process.env.WEBHOOK_BASE_URL || request.nextUrl.origin;
        const reportUrl = buildPublicReportUrl(baseUrl, shareToken, "diag");

        await sendWhatsAppReportLink(
          user.phoneNumber,
          user.name || "Learner",
          reportUrl,
          "diagnostic",
        );
      }
    } catch (whatsappError) {
      console.error(
        "Failed to send WhatsApp final report link:",
        whatsappError,
      );
    }

    return NextResponse.json({
      status: "READY",
      shareToken,
    });
  } catch (error) {
    console.error("Final report generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate final report",
      },
      { status: 500 },
    );
  }
}

function getLanguageAverage(levels: Record<string, unknown> | null) {
  if (!levels) {
    return 0;
  }

  const scores = Object.values(levels)
    .map((value) =>
      typeof value === "string" ? LANGUAGE_LEVEL_SCORE[value] : undefined,
    )
    .filter((value): value is number => typeof value === "number");

  if (!scores.length) {
    return 0;
  }

  return scores.reduce((total, score) => total + score, 0) / scores.length;
}

const LANGUAGE_LEVEL_SCORE: Record<string, number> = {
  "Pre-A1": 0,
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
};
