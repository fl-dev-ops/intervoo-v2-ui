import { describe, expect, test } from "vitest";
import {
  buildDiagnosticJobOptions,
  getDefaultDiagnosticBand,
  type DiagnosticBand,
} from "#/lib/diagnostics/job-options";
import type {
  PrediagnosticsReport,
  PrediagnosticsReportStatusResponse,
} from "#/lib/prediagnostics/report";

function buildStatus(reportJson: PrediagnosticsReport) {
  return {
    session: {
      id: "session-1",
      status: "REPORT_READY",
      roomName: "room-1",
      startedAt: "2026-04-26T00:00:00.000Z",
      endedAt: "2026-04-26T00:05:00.000Z",
      transcript: null,
    },
    report: {
      id: "report-1",
      status: "READY",
      promptVersion: "v1",
      fileUri: null,
      reportJson,
      errorMessage: null,
      metadata: null,
    },
  } satisfies PrediagnosticsReportStatusResponse;
}

const report = {
  dream_job: "Core Engineering at Google",
  aiming_for: "Product Developer",
  backup: "IT Services",
  salary_expectation: "₹10 LPA",
  reasoning: null,
  companies_mentioned: ["Adobe", "Flipkart"],
  roles_mentioned: ["Product Developer"],
  job_awareness_category: "Strong",
  job_research_category: "Good",
  job_research_breakdown: {
    skills_research: "Good",
    tools_and_role_clarity: "Some gaps",
    salary_clarity: "Rough idea",
    jd_awareness: "Some gaps",
    company_clarity: "Clear",
  },
} satisfies PrediagnosticsReport;

describe("buildDiagnosticJobOptions", () => {
  test("maps dream, target, and backup report fields into job options", () => {
    const options = buildDiagnosticJobOptions(buildStatus(report));

    expect(options.map((option) => option.band)).toEqual<DiagnosticBand[]>([
      "dream",
      "target",
      "backup",
    ]);
    expect(options[0]?.title).toBe("Core Engineering at Google");
    expect(options[1]?.title).toBe("Product Developer");
    expect(options[1]?.salary).toBe("₹10 LPA");
    expect(options[2]?.title).toBe("IT Services");
  });

  test("omits empty and null jobs", () => {
    const options = buildDiagnosticJobOptions(
      buildStatus({
        ...report,
        dream_job: " ",
        aiming_for: null,
        backup: "IT Services",
      }),
    );

    expect(options).toHaveLength(1);
    expect(options[0]?.band).toBe("backup");
  });

  test("defaults selection to target when available", () => {
    const options = buildDiagnosticJobOptions(buildStatus(report));

    expect(getDefaultDiagnosticBand(options)).toBe("target");
  });
});
