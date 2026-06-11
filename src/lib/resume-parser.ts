import "server-only";

import { randomUUID } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const LOG_PREFIX = "[ResumeParser]";
const MODEL = "gemini-3.5-flash";

export type OnboardingProfile = {
  name: string;
  education: {
    degree: string;
    major: string;
    institution: string;
    years: string;
    standing: string;
  };
  skills: string[];
  projects: string[];
  projectKeywords: string[][];
  experience: string[];
  scores: { cgpa: string; twelfth: string; tenth: string };
  roleHint: string;
  experienceYears: number;
  resumeText: string;
};

const ResumeSchema = z.object({
  name: z.string().nullable(),
  education: z
    .array(
      z.object({
        institution: z.string().nullable(),
        degree: z.string().nullable(),
        major: z.string().nullable(),
        graduation_year: z.number().nullable(),
        cgpa: z.union([z.string(), z.number()]).nullable(),
        is_current: z.boolean().nullable(),
      }),
    )
    .default([]),
  skills: z.array(z.string()).default([]),
  projects: z
    .array(
      z.object({
        name: z.string().nullable(),
        description: z.string().nullable(),
        keywords: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  work_experience: z
    .array(
      z.object({
        company: z.string().nullable(),
        role: z.string().nullable(),
      }),
    )
    .default([]),
  experience_years: z.number().nullable(),
  strongest_domain: z.string().nullable(),
});

type ParsedResume = z.infer<typeof ResumeSchema>;

const SYSTEM_PROMPT = `You extract structured data from a candidate's resume for a job-matching product.
Return ONLY a single JSON object, no prose, matching exactly this shape:
{
  "name": string | null,
  "education": [
    { "institution": string, "degree": string, "major": string | null,
      "graduation_year": number | null, "cgpa": string | null, "is_current": boolean }
  ],
  "skills": string[],
  "projects": [ { "name": string, "description": string | null, "keywords": string[] } ],
  "work_experience": [ { "company": string, "role": string } ],
  "experience_years": number,
  "strongest_domain": string | null
}
Rules:
- Use [] for missing lists and null for missing scalars; never invent data.
- "skills" must be a flat, de-duplicated list of concrete skill names.
- "work_experience" is ONLY actual job-related work: paid employment (full-time, part-time, contract) or internships at a real company or organization. Each entry must be a role the candidate was employed for. Internships count here.
- "projects" is ONLY side-projects, personal projects, academic/course projects, hackathon work, and open-source contributions. These are NOT employment.
- Never put a project in "work_experience" and never put a job in "projects". If something has no employing company (e.g. a personal app, a GitHub repo, a college project), it is a project, not work experience.
- "project keywords" must be domain skills or tech concepts only (e.g. "real-time systems", "WebSocket", "distributed caching"). Exclude soft skills, team size, awards, and process words.
- "cgpa" is ONLY a numeric grade. Accept formats like "8.44", "3.7", "9.2/10", "72%", or grade classes like "First Class". Reject and set to null anything that describes how the degree was taken or its honours level — for example "Dist." / "Distance" / "Distance Education", "Regular", "Part-time" / "Full-time", "Online" / "Correspondence", "Hons." / "Honours". If the resume shows e.g. "B.E. (Dist.)" with no numeric grade, set cgpa to null and leave the "(Dist.)" out of every field (it is not a score, not a major, not a degree suffix worth keeping).
- Return only the JSON object.`;

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return apiKey;
}

async function writeBufferToTempFile(
  buffer: Buffer,
  extension: string,
): Promise<string> {
  const tempPath = join(tmpdir(), `resume-${randomUUID()}${extension}`);
  await writeFile(tempPath, buffer);
  return tempPath;
}

function guessMimeType(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop();
  const mimeMap: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    csv: "text/csv",
    txt: "text/plain",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    heif: "image/heif",
    heic: "image/heic",
  };
  return mimeMap[ext ?? ""] ?? "application/octet-stream";
}

async function mapToProfile(parsed: ParsedResume): Promise<OnboardingProfile> {
  const edu = parsed.education[0];
  const projects = parsed.projects
    .filter((p) => p.name)
    .map((p) =>
      p.description ? `${p.name} · ${p.description}` : (p.name as string),
    );
  const work = parsed.work_experience
    .filter((w) => w.role || w.company)
    .map((w) => [w.role, w.company].filter(Boolean).join(" · "));

  return {
    name: parsed.name ?? "",
    education: {
      degree: edu?.degree ?? "",
      major: edu?.major ?? "",
      institution: edu?.institution ?? "",
      years: edu?.graduation_year ? String(edu.graduation_year) : "",
      standing: edu?.is_current ? "current" : "",
    },
    skills: dedupe(parsed.skills.map((s) => s.trim()).filter(Boolean)),
    projects,
    projectKeywords: parsed.projects.map((p) => p.keywords ?? []),
    experience: work,
    scores: {
      cgpa: edu?.cgpa != null ? String(edu.cgpa) : "",
      twelfth: "",
      tenth: "",
    },
    roleHint: parsed.strongest_domain ?? parsed.work_experience[0]?.role ?? "",
    experienceYears: Math.max(0, Math.round(parsed.experience_years ?? 0)),
    resumeText: buildResumeText(parsed),
  };
}

function buildResumeText(parsed: ParsedResume): string {
  const roleHint =
    parsed.strongest_domain ?? parsed.work_experience[0]?.role ?? "";
  const skills = dedupe(parsed.skills.map((s) => s.trim()).filter(Boolean));
  const projects = parsed.projects
    .filter((p) => p.name)
    .map((p) =>
      p.description ? `${p.name}: ${p.description}` : (p.name as string),
    );
  const work = parsed.work_experience
    .filter((w) => w.role || w.company)
    .map((w) => [w.role, w.company].filter(Boolean).join(" at "));
  return [roleHint, skills.join(", "), work.join(". "), projects.join(". ")]
    .filter((s) => s?.trim())
    .join("\n");
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function parseResume(file: File): Promise<OnboardingProfile> {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  let tempFilePath: string | null = null;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = guessMimeType(file.name);
    const extension = file.name.includes(".")
      ? `.${file.name.split(".").pop()}`
      : ".bin";

    tempFilePath = await writeBufferToTempFile(buffer, extension);

    console.info(LOG_PREFIX, "Uploading file to Gemini", {
      filename: file.name,
      mimeType,
      size: buffer.length,
    });

    const uploaded = await ai.files.upload({
      file: tempFilePath,
      config: {
        mimeType,
        displayName: file.name,
      },
    });

    if (!uploaded.name) {
      throw new Error("Gemini upload returned no file name");
    }

    console.info(LOG_PREFIX, "File uploaded, analyzing", {
      fileName: uploaded.name,
    });

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { fileData: { fileUri: uploaded.uri ?? "", mimeType } },
            { text: "Extract structured data from this resume." },
          ],
        },
      ],
      config: {
        temperature: 0,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            name: { type: "string", nullable: true },
            education: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  institution: { type: "string", nullable: true },
                  degree: { type: "string", nullable: true },
                  major: { type: "string", nullable: true },
                  graduation_year: { type: "number", nullable: true },
                  cgpa: { type: "string", nullable: true },
                  is_current: { type: "boolean", nullable: true },
                },
              },
            },
            skills: { type: "array", items: { type: "string" } },
            projects: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", nullable: true },
                  description: { type: "string", nullable: true },
                  keywords: { type: "array", items: { type: "string" } },
                },
              },
            },
            work_experience: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  company: { type: "string", nullable: true },
                  role: { type: "string", nullable: true },
                },
              },
            },
            experience_years: { type: "number", nullable: true },
            strongest_domain: { type: "string", nullable: true },
          },
        },
        systemInstruction: SYSTEM_PROMPT,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini returned empty response");
    }

    console.info(LOG_PREFIX, "Parsing Gemini response");

    const json = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const raw = JSON.parse(json);
    const parsed = ResumeSchema.parse(raw);

    return mapToProfile(parsed);
  } finally {
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
      } catch {
        // ignore cleanup errors
      }
    }
  }
}
