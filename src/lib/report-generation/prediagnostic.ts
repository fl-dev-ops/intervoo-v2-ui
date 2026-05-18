import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateReport } from "./generate-report";
import { buildPreDiagnosticRubric } from "./rubrics";
import { buildReportTranscriptPromptText } from "./transcript";

const CareerGoalSchema = z.object({
  role: z.string().nullable(),
  workContext: z.string().nullable(),
  organizationType: z.string().nullable(),
  workArrangement: z.string().nullable(),
  rawText: z.string().nullable(),
});

const PreDiagnosticReportSchema = z.object({
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

export async function generatePreDiagnosticReport(sessionId: string) {
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: { user: { include: { profile: true } } },
  });

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  if (session.type !== "PREDIAGNOSTIC") {
    throw new Error(`Session type is not PREDIAGNOSTIC: ${session.type}`);
  }

  const profile = session.user.profile;
  const transcriptPromptText = buildReportTranscriptPromptText(
    session.transcript,
  );

  if (!transcriptPromptText) {
    throw new Error("No transcript is available for this session yet");
  }

  const prompt = `${buildPreDiagnosticRubric({
    name: profile?.preferredName || session.user.name,
    college: profile?.institution,
    degree: profile?.degree,
    stream: profile?.stream,
    year: profile?.yearOfStudy,
  })}

Conversation transcript (ordered, includes student and agent):
${transcriptPromptText}`;

  return generateReport({
    prompt,
    schema: PreDiagnosticReportSchema,
    system:
      "You are a strict extraction and analysis engine. Return only the structured JSON object requested by the schema.",
  });
}
