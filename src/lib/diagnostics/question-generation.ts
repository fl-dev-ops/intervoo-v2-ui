import "server-only";

import { z } from "zod";
import type { JobDetail } from "@/lib/jd-client";
import type { DiagnosticQuestionType } from "@/lib/report-generation/diagnostic-activity";

export type GeneratedDiagnosticQuestion = {
  id: string;
  text: string;
  question_type: DiagnosticQuestionType[];
  category: string;
  difficulty_level: string;
  band: number;
  competency?: string;
};

export type DiagnosticQuestionGenerationInput = {
  band: number;
  category: string;
  competencies: string[];
  job: Pick<JobDetail, "jobId" | "jobTitle" | "requiredSkills" | "roleSummary">;
  participant: {
    skills: string[];
    projects: string[];
  };
  roundId: string;
};

export type DiagnosticQuestionGenerationResult = {
  questions: GeneratedDiagnosticQuestion[];
  metadata: {
    generated_at: string;
    provider: "rounds-prototype";
    question_count: number;
    source: "api";
  };
};

const BASE_URL =
  process.env.INTERVIEW_ROUNDS_API_URL ||
  "https://interview-rounds-prototype.vercel.app";

const QuestionResponseSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      question_type: z.array(z.enum(["Language", "Thinking", "Confidence"])),
    }),
  ),
});

export async function generateDiagnosticQuestions(
  input: DiagnosticQuestionGenerationInput,
): Promise<DiagnosticQuestionGenerationResult> {
  const response = await fetch(
    `${BASE_URL}/api/jobs/${encodeURIComponent(input.job.jobId)}/questions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roundSlug: input.roundId,
        roundTitle: input.category,
        competencies: input.competencies,
        jobTitle: input.job.jobTitle,
        requiredSkills: input.job.requiredSkills,
        roleSummary: input.job.roleSummary,
        candidateSkills: input.participant.skills,
        candidateProjects: input.participant.projects,
      }),
    },
  );

  const body: unknown = await response.json();
  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : `Question API request failed (${response.status})`;
    throw new Error(message);
  }

  const parsed = QuestionResponseSchema.parse(body);
  const questions = parsed.questions.map((question) => ({
    ...question,
    category: input.category,
    difficulty_level: "medium",
    band: input.band,
  }));

  if (!questions.length) {
    throw new Error("Question API returned no diagnostic questions");
  }

  return {
    questions,
    metadata: {
      generated_at: new Date().toISOString(),
      provider: "rounds-prototype",
      question_count: questions.length,
      source: "api",
    },
  };
}
