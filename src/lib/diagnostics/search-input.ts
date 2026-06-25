import "server-only";

import type { JobAnalysisInput, SearchInput } from "@/lib/jd-client";

// Source fields read off a `Resume` row. JSON columns arrive as `unknown`
// (Prisma JsonValue) and are coerced defensively here.
export type ResumeSearchSource = {
  role: string;
  experienceYears: number | null;
  skills: string[];
  experience: unknown;
  projects: unknown;
  skillGlosses: unknown;
  projectKeywords: unknown;
  projectCapabilities: unknown;
  workInitiatives: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asStringMatrix(value: unknown): string[][] {
  return asArray(value).map((row) =>
    asArray(row).filter((s): s is string => typeof s === "string"),
  );
}

// Per-project evidence strings: prefer LLM capabilities, else
// "<title · description>. Keywords: …", else keywords-only for projectless
// profiles. Mirrors rounds-prototype's buildProjectTexts.
function buildProjectTexts(
  projects: unknown[],
  keywords: string[][],
  capabilities: string[][],
): string[] {
  if (projects.length > 0) {
    return projects.flatMap((proj, i) => {
      const caps = capabilities[i] ?? [];
      if (caps.length > 0) return caps;

      const p =
        proj && typeof proj === "object"
          ? (proj as Record<string, unknown>)
          : {};
      const title = typeof p.title === "string" ? p.title : "";
      const description =
        typeof p.description === "string" ? p.description : "";
      const base = [title, description].filter(Boolean).join(" · ");
      const kws = keywords[i] ?? [];
      const text =
        kws.length > 0 ? `${base}. Keywords: ${kws.join(", ")}` : base;
      return text ? [text] : [];
    });
  }
  return keywords.map((kws) => kws.join(", ")).filter(Boolean);
}

// Build the external search input from a Resume row, sending glossed skills and
// rich project/initiative evidence so the API's match% reflects them.
export function buildResumeSearchInput(
  resume: ResumeSearchSource,
): SearchInput {
  const glosses = asRecord(resume.skillGlosses);
  const skills = resume.skills.map((name) => ({
    name,
    gloss: typeof glosses[name] === "string" ? (glosses[name] as string) : null,
  }));

  const projectTexts = buildProjectTexts(
    asArray(resume.projects),
    asStringMatrix(resume.projectKeywords),
    asStringMatrix(resume.projectCapabilities),
  );
  const initiativeTexts = asStringMatrix(resume.workInitiatives)
    .flat()
    .filter(Boolean);

  return {
    companyText: "",
    roleText: resume.role,
    skills,
    skillNames: resume.skills,
    experienceYears: resume.experienceYears,
    projectTexts: [...projectTexts, ...initiativeTexts],
    sort: "default",
  };
}

export function buildResumeAnalysisInput(
  resume: ResumeSearchSource,
): JobAnalysisInput {
  const experienceYears =
    typeof resume.experienceYears === "number" ? resume.experienceYears : null;
  const projectTexts = buildProjectTexts(
    asArray(resume.projects),
    asStringMatrix(resume.projectKeywords),
    asStringMatrix(resume.projectCapabilities),
  );
  const initiativeTexts = asStringMatrix(resume.workInitiatives)
    .flat()
    .filter(Boolean);

  return {
    candidateSkills: resume.skills,
    candidateExperience: formatResumeExperience(resume.experience),
    candidateProjects: projectTexts,
    candidateInitiatives: initiativeTexts,
    experienceMinYears: experienceYears ?? undefined,
    experienceMaxYears: experienceYears ?? undefined,
  };
}

function formatResumeExperience(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return "";
      const e = entry as Record<string, unknown>;
      const title = typeof e.title === "string" ? e.title : "";
      const company = typeof e.company === "string" ? e.company : "";
      const description =
        typeof e.description === "string" ? e.description : "";
      const header = [title, company].filter(Boolean).join(" · ");
      return [header, description].filter(Boolean).join(": ");
    })
    .filter(Boolean);
}
