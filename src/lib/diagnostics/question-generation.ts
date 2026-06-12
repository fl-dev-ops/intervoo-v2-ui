import "server-only";

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { getGeminiApiKey } from "@/lib/gemini-client";
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
  };
  roundId: string;
};

export type DiagnosticQuestionGenerationResult = {
  questions: GeneratedDiagnosticQuestion[];
  metadata: {
    generated_at: string;
    model: string;
    provider: "gemini";
    question_count: number;
    source: "llm";
  };
};

const MODEL = process.env.DIAGNOSTIC_QUESTION_MODEL_ID ?? "gemini-2.5-flash";
const QUESTION_COUNT = 6;

const GeneratedQuestionSchema = z.object({
  text: z.string().trim().min(12),
  question_type: z
    .array(z.enum(["Language", "Thinking", "Confidence"]))
    .min(1)
    .max(3),
  difficulty_level: z.string().trim().min(1).default("medium"),
  competency: z.string().trim().optional(),
});

const GeneratedQuestionResponseSchema = z.object({
  questions: z.array(GeneratedQuestionSchema).min(QUESTION_COUNT).max(8),
});

const SYSTEM_PROMPT = `You generate concise, spoken interview questions for a live voice diagnostic interview.
Return ONLY valid JSON matching this shape:
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
- Generate exactly 6 questions.
- Questions must be directly askable by a voice agent.
- Use the target job, round, competencies, and candidate profile.
- Each question should be one sentence, under 32 words.
- Avoid yes/no questions.
- Avoid multi-part questions unless the parts are naturally connected.
- Do not include answers, rubrics, notes, markdown, or prose outside JSON.
- question_type must include the dimensions the answer should evaluate: Language, Thinking, Confidence.`;

export async function generateDiagnosticQuestions(
  input: DiagnosticQuestionGenerationInput,
): Promise<DiagnosticQuestionGenerationResult> {
  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [{ text: buildPrompt(input) }],
      },
    ],
    config: {
      temperature: 0.4,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
      systemInstruction: SYSTEM_PROMPT,
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned empty diagnostic questions");
  }

  const parsed = GeneratedQuestionResponseSchema.parse(
    JSON.parse(stripCodeFence(response.text)),
  );
  const questions = parsed.questions
    .slice(0, QUESTION_COUNT)
    .map((question, i) => ({
      id: `${input.roundId}_q${i + 1}`,
      text: question.text,
      question_type: question.question_type,
      category: input.category,
      difficulty_level: question.difficulty_level,
      band: input.band,
      competency: question.competency,
    }));

  return {
    questions,
    metadata: {
      generated_at: new Date().toISOString(),
      model: MODEL,
      provider: "gemini",
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

function stripCodeFence(text: string) {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}
