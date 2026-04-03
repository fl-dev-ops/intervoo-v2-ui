import { describe, expect, test, vi } from "vitest";

vi.mock("../../rubrics/pre-call.md?raw", () => ({
  default: "Name: {name}\nCollege: {college}\nDegree: {degree}\nStream: {stream}\nYear: {year}",
}));

import {
  appendPreScreenPromptFormatInstructions,
  buildPreScreenPrompt,
  parsePreScreenReportResponse,
  renderPreScreenPromptTemplate,
  sanitizeModelJsonText,
} from "#/pre-screening/pre-screening-report";

describe("sanitizeModelJsonText", () => {
  test("extracts the JSON object from a model response with leading text and markdown fences", () => {
    const raw = [
      "Here is the result:",
      "",
      "summary below",
      "",
      "```json",
      "{",
      '  "dream_job": null,',
      '  "aiming_for": null,',
      '  "backup": null,',
      '  "salary_expectation": null,',
      '  "reasoning": null,',
      '  "companies_mentioned": [],',
      '  "roles_mentioned": [],',
      '  "job_awareness_category": "Unclear"',
      "}",
      "```",
      "Thanks.",
    ].join("\n");

    expect(sanitizeModelJsonText(raw)).toBe(`{
  "dream_job": null,
  "aiming_for": null,
  "backup": null,
  "salary_expectation": null,
  "reasoning": null,
  "companies_mentioned": [],
  "roles_mentioned": [],
  "job_awareness_category": "Unclear"
}`);
  });
});

describe("renderPreScreenPromptTemplate", () => {
  test("fills missing prompt values with Not provided", () => {
    const rendered = renderPreScreenPromptTemplate(
      "Name: {name}\nCollege: {college}\nDegree: {degree}\nStream: {stream}\nYear: {year}",
      { name: "Asha", college: undefined, degree: null, stream: "CSE", year: "  " },
    );

    expect(rendered).toContain("Name: Asha");
    expect(rendered).toContain("College: Not provided");
    expect(rendered).toContain("Degree: Not provided");
    expect(rendered).toContain("Stream: CSE");
    expect(rendered).toContain("Year: Not provided");
  });
});

describe("appendPreScreenPromptFormatInstructions", () => {
  test("appends the strict JSON-only contract", () => {
    const prompt = appendPreScreenPromptFormatInstructions("Base prompt");

    expect(prompt).toContain("Return valid JSON only.");
    expect(prompt).toContain('"job_awareness_category": "Unclear | Clear | Strong"');
  });
});

describe("buildPreScreenPrompt", () => {
  test("builds a prompt with substituted values and a stable short hash", async () => {
    const result = await buildPreScreenPrompt({
      name: "Asha",
      college: null,
      degree: "B.Tech",
      stream: "CSE",
      year: undefined,
    });

    expect(result.prompt).toContain("Name: Asha");
    expect(result.prompt).toContain("College: Not provided");
    expect(result.prompt).toContain("Degree: B.Tech");
    expect(result.prompt).toContain("Return valid JSON only.");
    expect(result.promptVersion).toHaveLength(16);
  });
});

describe("parsePreScreenReportResponse", () => {
  test("parses a fenced model response into the expected report shape", () => {
    const parsed = parsePreScreenReportResponse(`\`\`\`json
{
  "dream_job": "Product engineer",
  "aiming_for": "Frontend developer",
  "backup": null,
  "salary_expectation": "6 LPA",
  "reasoning": "Enjoys building products.",
  "companies_mentioned": ["Acme"],
  "roles_mentioned": ["Frontend developer"],
  "job_awareness_category": "Clear"
}
\`\`\``);

    expect(parsed.job_awareness_category).toBe("Clear");
    expect(parsed.roles_mentioned).toEqual(["Frontend developer"]);
    expect(parsed.job_research_category).toBeUndefined();
  });

  test("rejects invalid awareness values", () => {
    expect(() =>
      parsePreScreenReportResponse(`{
        "dream_job": null,
        "aiming_for": null,
        "backup": null,
        "salary_expectation": null,
        "reasoning": null,
        "companies_mentioned": [],
        "roles_mentioned": [],
        "job_awareness_category": "Excellent"
      }`),
    ).toThrow(/job_awareness_category/);
  });
});
