import "server-only";

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { uploadGeminiFileFromS3 } from "./gemini-resumable-upload";
import { getResumeObjectStream } from "./s3";

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

const BasicFieldsSchema = z.object({
  name: z.string().nullable().default(null),
  email: z.string().nullable().default(null),
  phone_number: z.string().nullable().default(null),
  experience_years: z.number().nullable().default(null),
  strongest_domain: z.string().nullable().default(null),
});

const EducationSchema = z
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
  .default([]);

const SkillsSchema = z
  .array(
    z.union([
      z.object({
        name: z.string(),
        gloss: z.string().nullable().default(null),
      }),
      z.string().transform((name) => ({ name, gloss: null })),
    ]),
  )
  .default([]);

const ProjectsSchema = z
  .array(
    z.object({
      name: z.string().nullable().default(null),
      description: z.string().nullable().default(null),
      keywords: z.array(z.string()).default([]),
      capabilities: z.array(z.string()).default([]),
    }),
  )
  .default([]);

const WorkExperienceSchema = z
  .array(
    z.object({
      company: z.string().nullable().default(null),
      role: z.string().nullable().default(null),
      start_date: z.string().nullable().default(null),
      end_date: z.string().nullable().default(null),
      initiatives: z.array(z.string()).default([]),
    }),
  )
  .default([]);

const ResumeSchema = BasicFieldsSchema.extend({
  education: EducationSchema,
  // Accept both the {name, gloss} shape and a bare string (model-drift safety).
  skills: SkillsSchema,
  projects: ProjectsSchema,
  work_experience: WorkExperienceSchema,
});

type ParsedResume = z.infer<typeof ResumeSchema>;

const ResumeStreamLineSchema = z.discriminatedUnion("section", [
  z.object({ section: z.literal("basic"), data: BasicFieldsSchema }),
  z.object({
    section: z.literal("education"),
    data: z.object({ education: EducationSchema }),
  }),
  z.object({
    section: z.literal("skills"),
    data: z.object({ skills: SkillsSchema }),
  }),
  z.object({
    section: z.literal("experience"),
    data: z.object({ work_experience: WorkExperienceSchema }),
  }),
  z.object({
    section: z.literal("projects"),
    data: z.object({ projects: ProjectsSchema }),
  }),
]);

type ResumeStreamLine = z.infer<typeof ResumeStreamLineSchema>;
type SectionEvent<T> = T extends ResumeStreamLine
  ? T & { type: "section" }
  : never;

export type ResumeParseStreamEvent =
  | SectionEvent<ResumeStreamLine>
  | { type: "complete"; profile: OnboardingProfile };

export type ResumeFileInput = {
  contentLength: number;
  contentType: string;
  displayName: string;
  key: string;
};

const SYSTEM_PROMPT = `You extract structured data from a candidate's resume for a job-matching product.
Return EXACTLY five newline-delimited JSON objects (NDJSON), in this order, with one complete object per line and no markdown or prose:
{"section":"basic","data":{"name":string|null,"email":string|null,"phone_number":string|null,"experience_years":number,"strongest_domain":string|null}}
{"section":"education","data":{"education":[{"institution":string,"degree":string,"major":string|null,"graduation_year":number|null,"cgpa":string|null,"is_current":boolean}]}}
{"section":"skills","data":{"skills":[{"name":string,"gloss":string}]}}
{"section":"experience","data":{"work_experience":[{"company":string,"role":string,"start_date":string|null,"end_date":string|null,"initiatives":string[]}]}}
{"section":"projects","data":{"projects":[{"name":string,"description":string|null,"keywords":string[],"capabilities":string[]}]}}
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
- Return only the five NDJSON objects, one object per line.`;

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return apiKey;
}

async function mapToProfile(parsed: ParsedResume): Promise<OnboardingProfile> {
  const edu = parsed.education[0];
  const projects = parsed.projects
    .filter((p) => p.name)
    .map((p) =>
      p.description ? `${p.name} · ${p.description}` : (p.name as string),
    );
  const filteredWork = parsed.work_experience.filter(
    (w) => w.role || w.company,
  );
  const workExperience = filteredWork.map((w) => ({
    company: w.company || "",
    role: w.role || "",
    start_date: w.start_date || "",
    end_date: w.end_date || "",
  }));
  const work = workExperience.map((w) =>
    [w.role, w.company].filter(Boolean).join(" · "),
  );

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
    projectKeywords: parsed.projects.map((p) => p.keywords),
    projectCapabilities: parsed.projects.map((p) => p.capabilities),
    work_experience: workExperience,
    workInitiatives: filteredWork.map((w) => w.initiatives),
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

export async function* parseResumeStream(
  file: ResumeFileInput,
  signal?: AbortSignal,
): AsyncGenerator<ResumeParseStreamEvent> {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  console.info(LOG_PREFIX, "Uploading file to Gemini", {
    mimeType: file.contentType,
  });

  const uploaded = await uploadGeminiFileFromS3({
    apiKey,
    contentLength: file.contentLength,
    displayName: file.displayName,
    mimeType: file.contentType,
    openStream: (offset, abortSignal) =>
      getResumeObjectStream({ key: file.key, offset, signal: abortSignal }),
    signal,
  });

  console.info(LOG_PREFIX, "File uploaded, analyzing", {
    fileName: uploaded.name,
  });

  const response = await ai.models.generateContentStream({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            fileData: {
              fileUri: uploaded.uri ?? "",
              mimeType: file.contentType,
            },
          },
          {
            text: "Extract all structured data from this resume. Return exactly the five NDJSON section objects specified by the system instruction, in the required order.",
          },
        ],
      },
    ],
    config: {
      abortSignal: signal,
      temperature: 0,
      maxOutputTokens: 8192,
      systemInstruction: SYSTEM_PROMPT,
    },
  });

  console.info(LOG_PREFIX, "Streaming Gemini response");

  let pendingText = "";
  const parsedFields: Record<string, unknown> = {};
  const receivedSections = new Set<ResumeStreamLine["section"]>();

  for await (const chunk of response) {
    pendingText += chunk.text ?? "";
    const lines = pendingText.split(/\r?\n/);
    pendingText = lines.pop() ?? "";

    for (const line of lines) {
      const streamLine = parseNdjsonLine(line);
      if (!streamLine || receivedSections.has(streamLine.section)) continue;

      receivedSections.add(streamLine.section);
      Object.assign(parsedFields, streamLine.data);
      yield { type: "section", ...streamLine };
    }
  }

  const finalLine = parseNdjsonLine(pendingText);
  if (finalLine && !receivedSections.has(finalLine.section)) {
    receivedSections.add(finalLine.section);
    Object.assign(parsedFields, finalLine.data);
    yield { type: "section", ...finalLine };
  }

  if (receivedSections.size !== ResumeStreamLineSchema.options.length) {
    throw new Error(
      `Gemini returned ${receivedSections.size} of ${ResumeStreamLineSchema.options.length} resume sections`,
    );
  }

  const parsed = ResumeSchema.parse(parsedFields);
  yield { type: "complete", profile: await mapToProfile(parsed) };
}

function parseNdjsonLine(line: string): ResumeStreamLine | null {
  const json = line
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  if (!json) return null;
  return ResumeStreamLineSchema.parse(JSON.parse(json));
}
