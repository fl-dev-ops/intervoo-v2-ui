import "server-only";

import {
  type OnboardingProfile,
  parseResumeStream,
  type ResumeFileInput,
  type ResumeParseStreamEvent,
} from "./resume-parser";

export type ResumeData = {
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  experienceYears: number | null;
  education: {
    degree: string;
    stream: string;
    institution: string;
    graduationYear: string;
    score: string;
  }[];
  skills: string[];
  experience: {
    title: string;
    company: string;
    startDate: string;
    endDate: string;
    description: string;
  }[];
  projects: {
    title: string;
    description: string;
  }[];
  skillGlosses?: Record<string, string>;
  projectKeywords?: string[][];
  projectCapabilities?: string[][];
  workInitiatives?: string[][];
};

export type ResumeSection = Extract<
  ResumeParseStreamEvent,
  { type: "section" }
>["section"];

export type OnboardingResumeStreamEvent =
  | {
      type: "section";
      section: ResumeSection;
      data: Partial<ResumeData>;
    }
  | { type: "complete"; resume: ResumeData; resumeUrl?: string }
  | { type: "error"; error: string };

export async function* streamOnboardingResume(
  file: ResumeFileInput,
  resumeUrl?: string,
  signal?: AbortSignal,
): AsyncGenerator<OnboardingResumeStreamEvent> {
  for await (const event of parseResumeStream(file, signal)) {
    yield event.type === "complete"
      ? { type: "complete", resume: normalizeProfile(event.profile), resumeUrl }
      : normalizeSection(event);
  }
}

function normalizeSection(
  event: Extract<ResumeParseStreamEvent, { type: "section" }>,
): Extract<OnboardingResumeStreamEvent, { type: "section" }> {
  switch (event.section) {
    case "basic":
      return {
        type: "section",
        section: event.section,
        data: {
          name: event.data.name || "",
          email: event.data.email || "",
          phoneNumber: event.data.phone_number || "",
          role: event.data.strongest_domain || "",
          experienceYears: event.data.experience_years ?? null,
        },
      };
    case "education": {
      const education = event.data.education[0];
      return {
        type: "section",
        section: event.section,
        data: {
          education: education
            ? [
                {
                  degree: education.degree || "",
                  stream: education.major || "",
                  institution: education.institution || "",
                  graduationYear: education.graduation_year
                    ? String(education.graduation_year)
                    : "",
                  score: education.cgpa != null ? String(education.cgpa) : "",
                },
              ]
            : [],
        },
      };
    }
    case "skills":
      return {
        type: "section",
        section: event.section,
        data: { skills: event.data.skills.map((skill) => skill.name) },
      };
    case "experience":
      return {
        type: "section",
        section: event.section,
        data: {
          experience: event.data.work_experience.map((experience) => ({
            title: experience.role || "",
            company: experience.company || "",
            startDate: experience.start_date || "",
            endDate: experience.end_date || "",
            description: "",
          })),
        },
      };
    case "projects":
      return {
        type: "section",
        section: event.section,
        data: {
          projects: event.data.projects.map((project) => ({
            title: project.name || "",
            description: project.description || "",
          })),
        },
      };
    default:
      return assertNever(event);
  }
}

function normalizeProfile(profile: OnboardingProfile): ResumeData {
  return {
    name: profile.name || "",
    email: profile.email || "",
    phoneNumber: profile.phoneNumber || "",
    role: profile.roleHint || "",
    experienceYears: profile.experienceYears ?? null,
    education: [
      {
        degree: profile.education.degree || "",
        stream: profile.education.major || "",
        institution: profile.education.institution || "",
        graduationYear: profile.education.years || "",
        score: profile.scores?.cgpa || "",
      },
    ],
    skills: profile.skills || [],
    experience: (profile.work_experience || []).map((experience) => ({
      title: experience.role || "",
      company: experience.company || "",
      startDate: experience.start_date || "",
      endDate: experience.end_date || "",
      description: "",
    })),
    projects: (profile.projects || []).map((project) => {
      const [title, description] = splitResumePair(project);
      return { title, description };
    }),
    skillGlosses: profile.skillGlosses || {},
    projectKeywords: profile.projectKeywords || [],
    projectCapabilities: profile.projectCapabilities || [],
    workInitiatives: profile.workInitiatives || [],
  };
}

function splitResumePair(value: string) {
  const parts = value
    .split(/\s+[·-]\s+|:\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) return [value, ""] as const;
  return [parts[0], parts.slice(1).join(" - ")] as const;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled resume stream event: ${JSON.stringify(value)}`);
}
