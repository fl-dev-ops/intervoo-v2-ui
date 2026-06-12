import "server-only";

import { z } from "zod";
import type { JobDetail } from "@/lib/jd-client";
import type { DiagnosticQuestionType } from "@/lib/report-generation/diagnostic-activity";
import { generateReport } from "@/lib/report-generation/generate-report";

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
  job: Pick<
    JobDetail,
    | "jobId"
    | "jobTitle"
    | "companyName"
    | "requiredSkills"
    | "roleSummary"
    | "fullJobDescription"
  >;
  participant: {
    name: string;
    role: string;
    skills: string[];
    experienceYears: number | null;
    education: unknown;
    experience: string[];
    projects: string[];
  };
  roundId: string;
};

export type DiagnosticQuestionGenerationResult = {
  questions: GeneratedDiagnosticQuestion[];
  metadata: {
    generated_at: string;
    model: string;
    provider: "openrouter";
    question_count: number;
    source: "llm";
  };
};

const MODEL = process.env.DIAGNOSTIC_QUESTION_MODEL_ID ?? "openai/gpt-4o-mini";
const QUESTION_COUNT = 10;

// NOTE: no min/max/length constraints — OpenAI strict structured-output mode
// (used by the OpenRouter provider) rejects minItems/maxItems/minLength etc.
// Count and non-empty dimensions are enforced by the prompt + post-processing.
const GeneratedQuestionSchema = z.object({
  text: z.string(),
  question_type: z.array(z.enum(["Language", "Thinking", "Confidence"])),
  difficulty_level: z.string(),
  competency: z.string(),
});

const GeneratedQuestionResponseSchema = z.object({
  questions: z.array(GeneratedQuestionSchema),
});

const SYSTEM_PROMPT = `You generate tailored interview questions for a specific round of a job interview.
Return ONLY a single JSON object matching exactly this shape:
{
  "questions": [
    {
      "text": string,
      "question_type": ("Language" | "Thinking" | "Confidence")[],
      "difficulty_level": string,
      "competency": string
    }
  ]
}
Rules:
- Generate exactly 10 questions that collectively cover all the round's competencies and job context.
- If candidate background is provided, personalise questions to their skills, projects, and experience level.
- Questions should sound like real interviewer questions (not generic advice).
- Return only the JSON object, no prose.`;

export async function generateDiagnosticQuestions(
  input: DiagnosticQuestionGenerationInput,
): Promise<DiagnosticQuestionGenerationResult> {
  const parsed = (await generateReport({
    schema: GeneratedQuestionResponseSchema,
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(input),
    modelId: MODEL,
  })) as z.infer<typeof GeneratedQuestionResponseSchema> | undefined;

  if (!parsed) {
    throw new Error("OpenRouter returned empty diagnostic questions");
  }

  const questions = parsed.questions
    .filter((q) => q.text.trim() && q.question_type.length)
    .slice(0, QUESTION_COUNT)
    .map((question, i) => ({
      id: `${input.roundId}_q${i + 1}`,
      text: question.text.trim(),
      question_type: question.question_type,
      category: input.category,
      difficulty_level: question.difficulty_level || "medium",
      band: input.band,
      competency: question.competency,
    }));

  if (!questions.length) {
    throw new Error("OpenRouter returned no usable diagnostic questions");
  }

  return {
    questions,
    metadata: {
      generated_at: new Date().toISOString(),
      model: MODEL,
      provider: "openrouter",
      question_count: questions.length,
      source: "llm",
    },
  };
}

function buildPrompt(input: DiagnosticQuestionGenerationInput) {
  return JSON.stringify({
    task: "Generate diagnostic interview questions for this session.",
    round: {
      id: input.roundId,
      category: input.category,
      band: input.band,
      competencies: input.competencies,
    },
    job: {
      id: input.job.jobId,
      title: input.job.jobTitle,
      company: input.job.companyName,
      required_skills: input.job.requiredSkills,
      role_summary: input.job.roleSummary,
      description: input.job.fullJobDescription?.slice(0, 3000) ?? "",
    },
    candidate: input.participant,
    output_requirements: {
      question_count: QUESTION_COUNT,
      voice_agent_ready: true,
      json_only: true,
    },
  });
}
