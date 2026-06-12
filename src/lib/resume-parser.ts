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
  email: string;
  phoneNumber: string;
  education: {
    degree: string;
    major: string;
    institution: string;
    years: string;
    standing: string;
  };
  skills: string[];
  skillGlosses: Record<string, string>;
  projects: string[];
  projectKeywords: string[][];
  projectCapabilities: string[][];
  work_experience: {
    company: string;
    role: string;
    start_date: string;
    end_date: string;
  }[];
  workInitiatives: string[][];
  experience: string[];
  scores: { cgpa: string; twelfth: string; tenth: string };
  roleHint: string;
  experienceYears: number;
  resumeText: string;
};

const ResumeSchema = z.object({
  name: z.string().nullable().default(null),
  email: z.string().nullable().default(null),
  phone_number: z.string().nullable().default(null),
  education: z
    .array(
      z.object({
        institution: z.string().nullable().default(null),
        degree: z.string().nullable().default(null),
        major: z.string().nullable().default(null),
        graduation_year: z.number().nullable().default(null),
        cgpa: z.union([z.string(), z.number()]).nullable().default(null),
        is_current: z.boolean().nullable().default(null),
      }),
    )
    .default([]),
  // Accept both the {name, gloss} shape and a bare string (model-drift safety).
  skills: z
    .array(
      z.union([
        z.object({
          name: z.string(),
          gloss: z.string().nullable().default(null),
        }),
        z.string().transform((name) => ({ name, gloss: null })),
      ]),
    )
    .default([]),
  projects: z
    .array(
      z.object({
        name: z.string().nullable().default(null),
        description: z.string().nullable().default(null),
        keywords: z.array(z.string()).default([]),
        capabilities: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  work_experience: z
    .array(
      z.object({
        company: z.string().nullable().default(null),
        role: z.string().nullable().default(null),
        start_date: z.string().nullable().default(null),
        end_date: z.string().nullable().default(null),
        initiatives: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  experience_years: z.number().nullable().default(null),
  strongest_domain: z.string().nullable().default(null),
});

type ParsedResume = z.infer<typeof ResumeSchema>;

const SYSTEM_PROMPT = `You extract structured data from a candidate's resume for a job-matching product.
Return ONLY a single JSON object, no prose, matching exactly this shape:
{
  "name": string | null,
  "email": string | null,
  "phone_number": string | null,
  "education": [
    { "institution": string, "degree": string, "major": string | null,
      "graduation_year": number | null, "cgpa": string | null, "is_current": boolean }
  ],
  "skills": [ { "name": string, "gloss": string } ],
  "projects": [ { "name": string, "description": string | null, "keywords": string[], "capabilities": string[] } ],
  "work_experience": [ { "company": string, "role": string, "start_date": string | null, "end_date": string | null, "initiatives": string[] } ],
  "experience_years": number,
  "strongest_domain": string | null
}
IMPORTANT: ALL fields must be present in the response. Never omit any field.
Rules:
- Use [] for missing lists and null for missing scalars; never invent data.
- "email" must be the candidate's email address. Extract from resume header or contact info. Use null if not found.
- "phone_number" must be the candidate's phone number with country code (e.g. "+919876543210"). Extract from resume header or contact info. Use null if not found.
- "experience_years" must be a number. Calculate from work_experience dates if available, otherwise estimate from education level and current year. Use 0 only if truly no experience can be determined.
- "skills" must be a flat, de-duplicated list. Include soft skills the resume explicitly lists (e.g. "Communication", "Team Collaboration") alongside technical skills — they match soft-skill job requirements.
- Each skill's "gloss" is an 8-15 word line describing what the skill is, expanding acronyms and naming the domain, e.g. {"name": "AWS", "gloss": "AWS (Amazon Web Services): cloud computing platform, cloud infrastructure services"}. Glosses are embedded for semantic matching — never leave them empty.
- "work_experience" is ONLY actual job-related work: paid employment (full-time, part-time, contract) or internships at a real company or organization. Each entry must be a role the candidate was employed for. Internships count here.
- "start_date" and "end_date" for work_experience should be in "MMM YYYY" format (e.g. "Jan 2020", "Mar 2018"). Use "Present" for current role. Use null if not found.
- "work_experience initiatives" must describe what was actually built or delivered — concrete systems, tools, analyses, or features, each as one sentence. Exclude soft-skill descriptions ("improved communication"), team sizes, and process words. Extract 2-4 per role; fewer if the resume gives fewer concrete details.
- "projects" is ONLY side-projects, personal projects, academic/course projects, hackathon work, and open-source contributions. These are NOT employment.
- Never put a project in "work_experience" and never put a job in "projects". If something has no employing company (e.g. a personal app, a GitHub repo, a college project), it is a project, not work experience.
- FALLBACK: If the resume contains NO standalone projects at all, derive 2-4 "projects" entries from the most significant work_experience initiatives instead — each a distinct system, feature, or migration the candidate built or led. Use the initiative as "name", a one-sentence summary as "description", 3-8 keywords, and 3-5 capabilities. Keep "work_experience" as the normal company/role entries only. Apply this fallback ONLY when "projects" would otherwise be empty.
- "project keywords" must be domain skills or tech concepts only (e.g. "real-time systems", "WebSocket", "distributed caching"). Exclude soft skills, team size, awards, and process words.
- "project capabilities" = 3-5 short, verb-led statements describing what the candidate built or did, phrased like job-description responsibilities (start with a verb, 4-9 words, no metrics, no soft skills, no tool-only fragments), e.g. "Design retrieval-augmented generation architectures", "Write clean, maintainable code following OOP principles". Derive from the project's own description; never copy examples verbatim. If a project describes no action, use [].
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
  const workExperience = (parsed.work_experience || [])
    .filter((w) => w.role || w.company)
    .map((w) => ({
      company: w.company || "",
      role: w.role || "",
      start_date: w.start_date || "",
      end_date: w.end_date || "",
    }));
  const work = workExperience.map((w) => [w.role, w.company].filter(Boolean).join(" · "));

  const skillNames = dedupe(
    parsed.skills.map((s) => s.name.trim()).filter(Boolean),
  );
  const skillGlosses: Record<string, string> = {};
  for (const s of parsed.skills) {
    const name = s.name.trim();
    if (name && s.gloss?.trim()) skillGlosses[name] = s.gloss.trim();
  }

  return {
    name: parsed.name ?? "",
    email: parsed.email ?? "",
    phoneNumber: parsed.phone_number ?? "",
    education: {
      degree: edu?.degree ?? "",
      major: edu?.major ?? "",
      institution: edu?.institution ?? "",
      years: edu?.graduation_year ? String(edu.graduation_year) : "",
      standing: edu?.is_current ? "current" : "",
    },
    skills: skillNames,
    skillGlosses,
    projects,
    projectKeywords: parsed.projects.map((p) => p.keywords ?? []),
    projectCapabilities: parsed.projects.map((p) => p.capabilities ?? []),
    work_experience: workExperience,
    workInitiatives: parsed.work_experience.map((w) => w.initiatives ?? []),
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
  const skills = dedupe(
    parsed.skills.map((s) => s.name.trim()).filter(Boolean),
  );
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
            { text: "Extract ALL structured data from this resume. Return a complete JSON object with ALL fields: name, email, phone_number, education, skills, projects, work_experience (with start_date and end_date), experience_years, and strongest_domain. Do not omit any field." },
          ],
        },
      ],
      config: {
        temperature: 0,
        maxOutputTokens: 8192,
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
