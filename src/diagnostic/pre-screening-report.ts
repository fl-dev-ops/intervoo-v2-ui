import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { PreScreenReport } from "#/diagnostic/pre-screening-types";

const PRE_SCREEN_PROMPT_PATH = path.resolve(process.cwd(), "rubrics/pre-call.md");

const awarenessCategorySchema = z.enum(["Unclear", "Clear", "Strong"]);
const researchCategorySchema = z.enum(["Not Enough", "Good", "Strong"]);
const researchSignalSchema = z.enum(["Good", "Some gaps", "Rough idea", "Not yet", "Clear"]);

export const preScreenReportSchema = z.object({
  dream_job: z.string().nullable(),
  aiming_for: z.string().nullable(),
  backup: z.string().nullable(),
  salary_expectation: z.string().nullable(),
  reasoning: z.string().nullable(),
  companies_mentioned: z.array(z.string()),
  roles_mentioned: z.array(z.string()),
  job_awareness_category: awarenessCategorySchema,
  job_research_category: researchCategorySchema.nullable().optional(),
  job_research_breakdown: z
    .object({
      skills_research: researchSignalSchema,
      tools_and_role_clarity: researchSignalSchema,
      salary_clarity: researchSignalSchema,
      jd_awareness: researchSignalSchema,
      company_clarity: researchSignalSchema,
    })
    .nullable()
    .optional(),
});

export type PreScreenPromptContext = {
  name?: string | null;
  college?: string | null;
  degree?: string | null;
  stream?: string | null;
  year?: string | null;
};

function normalizeLineEndings(value: string) {
  return value.replace(/\r\n/g, "\n");
}

function collapseExtraBlankLines(value: string) {
  return value.replace(/\n{3,}/g, "\n\n").trim();
}

function toPromptValue(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "Not provided";
}

export function sanitizeModelJsonText(text: string) {
  const trimmed = text.trim();

  const withoutFences = trimmed.startsWith("```")
    ? trimmed
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim()
    : trimmed;

  const objectStart = withoutFences.indexOf("{");
  const objectEnd = withoutFences.lastIndexOf("}");

  if (objectStart >= 0 && objectEnd > objectStart) {
    return withoutFences.slice(objectStart, objectEnd + 1);
  }

  return withoutFences;
}

export function normalizePreScreenPromptTemplate(template: string) {
  return collapseExtraBlankLines(normalizeLineEndings(template));
}

export function renderPreScreenPromptTemplate(template: string, context: PreScreenPromptContext) {
  return template
    .replaceAll("{name}", toPromptValue(context.name))
    .replaceAll("{college}", toPromptValue(context.college))
    .replaceAll("{degree}", toPromptValue(context.degree))
    .replaceAll("{stream}", toPromptValue(context.stream))
    .replaceAll("{year}", toPromptValue(context.year));
}

export function appendPreScreenPromptFormatInstructions(prompt: string) {
  return `${prompt}

Return valid JSON only.
Do not wrap the response in markdown fences.
Use exactly this shape:
{
  "dream_job": "string or null",
  "aiming_for": "string or null",
  "backup": "string or null",
  "salary_expectation": "string or null",
  "reasoning": "string or null",
  "companies_mentioned": ["string"],
  "roles_mentioned": ["string"],
  "job_awareness_category": "Unclear | Clear | Strong",
  "job_research_category": "Not Enough | Good | Strong",
  "job_research_breakdown": {
    "skills_research": "Good | Some gaps | Rough idea | Not yet | Clear",
    "tools_and_role_clarity": "Good | Some gaps | Rough idea | Not yet | Clear",
    "salary_clarity": "Good | Some gaps | Rough idea | Not yet | Clear",
    "jd_awareness": "Good | Some gaps | Rough idea | Not yet | Clear",
    "company_clarity": "Good | Some gaps | Rough idea | Not yet | Clear"
  }
}`;
}

export async function loadPreScreenPromptTemplate() {
  const template = await readFile(PRE_SCREEN_PROMPT_PATH, "utf8");
  return normalizePreScreenPromptTemplate(template);
}

export async function buildPreScreenPrompt(context: PreScreenPromptContext) {
  const template = await loadPreScreenPromptTemplate();
  const renderedTemplate = renderPreScreenPromptTemplate(template, context);
  const prompt = appendPreScreenPromptFormatInstructions(renderedTemplate);
  const promptVersion = createHash("sha256").update(prompt).digest("hex").slice(0, 16);

  return {
    prompt,
    promptVersion,
  };
}

export function parsePreScreenReportResponse(rawText: string): PreScreenReport {
  const parsed = JSON.parse(sanitizeModelJsonText(rawText)) as unknown;
  return preScreenReportSchema.parse(parsed);
}
