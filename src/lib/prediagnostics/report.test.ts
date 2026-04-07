import { describe, expect, test, vi } from "vitest";

vi.mock("../../../rubrics/pre-call.md?raw", () => ({
  default: "Name: {name}\nCollege: {college}\nDegree: {degree}\nStream: {stream}\nYear: {year}",
}));

import {
  buildPrediagnosticsPrompt,
  prediagnosticsReportSchema,
  renderPrediagnosticsPromptTemplate,
} from "#/lib/prediagnostics/report";

describe("renderPrediagnosticsPromptTemplate", () => {
  test("fills missing values with Not provided", () => {
    const rendered = renderPrediagnosticsPromptTemplate(
      "Name: {name}\nCollege: {college}\nDegree: {degree}\nStream: {stream}\nYear: {year}",
      {
        name: "Asha",
        college: undefined,
        degree: null,
        stream: "CSE",
        year: "  ",
      },
    );

    expect(rendered).toContain("Name: Asha");
    expect(rendered).toContain("College: Not provided");
    expect(rendered).toContain("Degree: Not provided");
    expect(rendered).toContain("Stream: CSE");
    expect(rendered).toContain("Year: Not provided");
  });
});

describe("buildPrediagnosticsPrompt", () => {
  test("builds a prompt with substituted values and a stable short hash", async () => {
    const result = await buildPrediagnosticsPrompt({
      name: "Asha",
      college: null,
      degree: "B.Tech",
      stream: "CSE",
      year: undefined,
    });

    expect(result.prompt).toContain("Name: Asha");
    expect(result.prompt).toContain("College: Not provided");
    expect(result.prompt).toContain("Degree: B.Tech");
    expect(result.promptVersion).toHaveLength(16);
  });
});

describe("prediagnosticsReportSchema", () => {
  test("accepts the exact report object shape used by the UI", () => {
    const parsed = prediagnosticsReportSchema.parse({
      backup: "any sort of role",
      dream_job: "Data Science Manager or Leader in a Product company",
      reasoning: "I like to analyze a lot of data and get insights through statistical analysis.",
      aiming_for: "Junior Data Scientist Role",
      roles_mentioned: ["Data Science", "Junior Data Scientist", "Data Science Manager", "Leader"],
      salary_expectation: null,
      companies_mentioned: [],
      job_research_category: "Good",
      job_awareness_category: "Strong",
      job_research_breakdown: {
        jd_awareness: "Some gaps",
        salary_clarity: "Not yet",
        company_clarity: "Rough idea",
        skills_research: "Good",
        tools_and_role_clarity: "Some gaps",
      },
    });

    expect(parsed.job_awareness_category).toBe("Strong");
    expect(parsed.job_research_breakdown?.salary_clarity).toBe("Not yet");
  });

  test("rejects invalid report category values", () => {
    expect(() =>
      prediagnosticsReportSchema.parse({
        backup: null,
        dream_job: null,
        reasoning: null,
        aiming_for: null,
        roles_mentioned: [],
        salary_expectation: null,
        companies_mentioned: [],
        job_research_category: "Excellent",
        job_awareness_category: "Strong",
        job_research_breakdown: null,
      }),
    ).toThrow(/job_research_category/);
  });
});
