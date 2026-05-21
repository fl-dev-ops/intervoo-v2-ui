import { z } from "zod";

const CareerGoalSchema = z.object({
  role: z.string().nullable(),
  workContext: z.string().nullable(),
  organizationType: z.string().nullable(),
  workArrangement: z.string().nullable(),
  rawText: z.string().nullable(),
});

export const PreDiagnosticReportSchema = z.object({
  dream_job: CareerGoalSchema.nullable(),
  aiming_for: CareerGoalSchema.nullable(),
  backup: CareerGoalSchema.nullable(),
  salary_expectation: z.string().nullable(),
  reasoning: z.string().nullable(),
  companies_mentioned: z.array(z.string()),
  roles_mentioned: z.array(z.string()),
  job_awareness_category: z.enum(["Unclear", "Clear", "Strong"]),
  job_research_category: z.enum(["Not Enough", "Good", "Strong"]).nullable(),
  job_research_breakdown: z
    .object({
      skills_research: z.enum([
        "Good",
        "Some gaps",
        "Rough idea",
        "Not yet",
        "Clear",
      ]),
      tools_and_role_clarity: z.enum([
        "Good",
        "Some gaps",
        "Rough idea",
        "Not yet",
        "Clear",
      ]),
      salary_clarity: z.enum([
        "Good",
        "Some gaps",
        "Rough idea",
        "Not yet",
        "Clear",
      ]),
      jd_awareness: z.enum([
        "Good",
        "Some gaps",
        "Rough idea",
        "Not yet",
        "Clear",
      ]),
      company_clarity: z.enum([
        "Good",
        "Some gaps",
        "Rough idea",
        "Not yet",
        "Clear",
      ]),
    })
    .nullable(),
});

export type PreDiagnosticReport = z.infer<typeof PreDiagnosticReportSchema>;
