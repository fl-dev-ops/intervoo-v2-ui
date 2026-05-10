import { prisma } from "@/lib/db";
import { DIAGNOSTIC_ROUNDS } from "@/lib/diagnostics/rounds-config";
import { toHydratedDiagnosticReport } from "@/lib/report-generation/diagnostic";
import { createUniquePublicReportToken } from "@/lib/report-share";

export type DerivedFinalDiagnosticReport = {
  overall_score: number;
  thinking_avg: number;
  language_avg: number;
  confidence_avg: number;
  salary_lpa: number;
  salary_band: string;
  salary_percentile: number;
  holistic_strengths: string[];
  holistic_improvements: string[];
  round_summaries: Array<{
    roundId: string;
    thinking_level: string;
    confidence_level: string;
    language_avg: number;
    strengths: string[];
    improvements: string[];
  }>;
  education_summary: string;
  aspiration_statement: string;
  reality_statement: string;
};

type RoundReportInput = {
  roundType: string;
  session: {
    report: {
      reportJson: unknown;
      status: string;
    } | null;
  } | null;
};

export function deriveFinalDiagnosticReport(
  rounds: RoundReportInput[],
): DerivedFinalDiagnosticReport | null {
  const orderedReports = DIAGNOSTIC_ROUNDS.map((roundConfig) => {
    const round = rounds.find((item) => item.roundType === roundConfig.id);
    const report = round?.session?.report;

    if (report?.status !== "READY") {
      return null;
    }

    const hydratedReport = toHydratedDiagnosticReport(report.reportJson);
    return hydratedReport
      ? { report: hydratedReport, roundId: roundConfig.id }
      : null;
  });

  if (orderedReports.some((report) => !report)) {
    return null;
  }

  const reports = orderedReports as NonNullable<
    (typeof orderedReports)[number]
  >[];
  const scores = reports.map((item) => item.report.assessment_result);
  const overallScore = average(scores.map((score) => score.total_score));
  const salaryLpa = average(scores.map((score) => score.salary_lpa));
  const salaryPercentile = average(
    scores.map((score) => score.salary_percentile),
  );

  return {
    overall_score: round(overallScore),
    thinking_avg: round(average(scores.map((score) => score.thinking_avg))),
    language_avg: round(average(scores.map((score) => score.language_avg))),
    confidence_avg: round(average(scores.map((score) => score.confidence_avg))),
    salary_lpa: round(salaryLpa),
    salary_band: getSalaryBandForScore(overallScore),
    salary_percentile: round(salaryPercentile * 100),
    holistic_strengths: uniqueLimited(
      reports.flatMap((item) => item.report.strengths),
      6,
    ),
    holistic_improvements: uniqueLimited(
      reports.flatMap((item) => item.report.improvement_areas),
      6,
    ),
    round_summaries: reports.map((item) => ({
      roundId: item.roundId,
      thinking_level: item.report.assessment_result.thinking_level,
      confidence_level: item.report.assessment_result.confidence_level,
      language_avg: round(item.report.assessment_result.language_avg),
      strengths: item.report.strengths,
      improvements: item.report.improvement_areas,
    })),
    education_summary: joinUnique(
      reports.map((item) => item.report.education_summary),
    ),
    aspiration_statement: joinUnique(
      reports.map((item) => item.report.aspiration_statement),
    ),
    reality_statement: joinUnique(
      reports.map((item) => item.report.reality_statement),
    ),
  };
}

export async function ensureFinalDiagnosticShareToken(diagnosticId: string) {
  const diagnostic = await prisma.diagnostic.findUnique({
    where: { id: diagnosticId },
    select: { finalReportShareToken: true },
  });

  if (!diagnostic) {
    return null;
  }

  if (diagnostic.finalReportShareToken) {
    return diagnostic.finalReportShareToken;
  }

  const shareToken = await createUniquePublicReportToken();
  await prisma.diagnostic.update({
    where: { id: diagnosticId },
    data: { finalReportShareToken: shareToken, status: "COMPLETED" },
  });

  return shareToken;
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function uniqueLimited(values: string[], limit: number) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  ).slice(0, limit);
}

function joinUnique(values: string[]) {
  return uniqueLimited(values, 4).join(" ");
}

function getSalaryBandForScore(totalScore: number) {
  if (totalScore >= 80) {
    return "₹35+ LPA";
  }

  if (totalScore >= 50) {
    return "₹15-35 LPA";
  }

  return "₹3.5-15 LPA";
}
