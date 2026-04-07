import { createHash } from "node:crypto";
import { z } from "zod";
import { createBundledTemplateLoader } from "#/lib/prediagnostics/bundled-template";
import preScreenPromptTemplateRaw from "../../../rubrics/pre-call.md?raw";

const awarenessCategorySchema = z.enum(["Unclear", "Clear", "Strong"]);
const researchCategorySchema = z.enum(["Not Enough", "Good", "Strong"]);
const researchSignalSchema = z.enum(["Good", "Some gaps", "Rough idea", "Not yet", "Clear"]);

export const prediagnosticsReportSchema = z.object({
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

export type PrediagnosticsReport = z.infer<typeof prediagnosticsReportSchema>;

export type PrediagnosticsPromptContext = {
  name?: string | null;
  college?: string | null;
  degree?: string | null;
  stream?: string | null;
  year?: string | null;
};

export type PrediagnosticsReportStatusResponse = {
  session: {
    id: string;
    status: string;
    roomName: string;
    startedAt: string;
    endedAt: string | null;
  };
  report: null | {
    id: string;
    status: string;
    promptVersion: string | null;
    fileUri: string | null;
    reportJson: PrediagnosticsReport | null;
    errorMessage: string | null;
    metadata: object | null;
  };
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

export function normalizePrediagnosticsPromptTemplate(template: string) {
  return collapseExtraBlankLines(normalizeLineEndings(template));
}

export function renderPrediagnosticsPromptTemplate(
  template: string,
  context: PrediagnosticsPromptContext,
) {
  return template
    .replaceAll("{name}", toPromptValue(context.name))
    .replaceAll("{college}", toPromptValue(context.college))
    .replaceAll("{degree}", toPromptValue(context.degree))
    .replaceAll("{stream}", toPromptValue(context.stream))
    .replaceAll("{year}", toPromptValue(context.year));
}

const loadBundledPrediagnosticsPromptTemplate = createBundledTemplateLoader(
  preScreenPromptTemplateRaw,
  normalizePrediagnosticsPromptTemplate,
);

export async function buildPrediagnosticsPrompt(context: PrediagnosticsPromptContext) {
  const template = await loadBundledPrediagnosticsPromptTemplate();
  const renderedTemplate = renderPrediagnosticsPromptTemplate(template, context);
  const prompt = renderedTemplate;
  const promptVersion = createHash("sha256").update(prompt).digest("hex").slice(0, 16);

  return {
    prompt,
    promptVersion,
  };
}
