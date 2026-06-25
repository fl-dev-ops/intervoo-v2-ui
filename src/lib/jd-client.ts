import "server-only";

const BASE_URL =
  process.env.INTERVIEW_ROUNDS_API_URL ||
  "https://interview-rounds-prototype.vercel.app";

type Result<T> = { error: string; data: null } | { error: null; data: T };

export type CompanyOption = { id: string; name: string };
export type SkillOption = { name: string };
export type Seniority = "entry" | "mid" | "senior";

export type ParsedRound = {
  position: number;
  slug: string;
  title: string;
};

export type Round = ParsedRound & { competencies: string[] };

export type JobCard = {
  jobId: string;
  jobTitle: string;
  companyName: string;
  seniority: Seniority;
  experienceMinYears: number | null;
  experienceMaxYears: number | null;
  roundCount: number;
  rounds: ParsedRound[];
  score: number | null;
  skillsPct: number | null;
  projectsPct: number | null;
  roleOrCompanyMatched: boolean;
  matchedSkills: number | null;
  totalSkills: number;
};

export type JobDetail = {
  jobId: string;
  jobTitle: string;
  companyName: string;
  seniority: Seniority;
  experienceMinYears: number | null;
  experienceMaxYears: number | null;
  location: string | null;
  workMode: string | null;
  educationRequirement: string | null;
  requiredSkills: string | null;
  roleSummary: string | null;
  sourceUrl: string | null;
  fullJobDescription: string | null;
  rounds: Round[];
};

export type SearchInput = {
  companyText: string;
  roleText: string;
  // Glossed skills drive semantic coverage on the external API; `skillNames` is
  // the token-only fallback the API uses when `skills` is absent.
  skills?: { name: string; gloss?: string | null }[];
  skillNames: string[];
  experienceYears: number | null;
  projectTexts?: string[];
  sort?: "default" | "score";
};

export type SearchResponse = {
  cards: JobCard[];
};

export type JobMatch = {
  score: number | null;
  skillsPct: number | null;
  projectsPct: number | null;
};

export type FitStatus = "found" | "missing";

export type FitItem = {
  text: string;
  status: FitStatus;
};

export type FitSection = {
  items: FitItem[];
};

export type SkillChip = {
  skill: string;
  matched: boolean;
};

export type JobFitAnalysis = {
  skills: SkillChip[];
  requirements: FitSection;
  responsibilities: FitSection;
  niceToHaves: FitSection;
};

export type JobAnalysisInput = {
  candidateSkills?: string[];
  candidateExperience?: string[];
  candidateProjects?: string[];
  candidateInitiatives?: string[];
  experienceMinYears?: number;
  experienceMaxYears?: number;
  overallPct?: number | null;
  skillsPct?: number | null;
  projectsPct?: number | null;
};

export async function getOptions(): Promise<
  Result<{ companies: CompanyOption[]; skills: SkillOption[] }>
> {
  const response = await fetch(`${BASE_URL}/api/options`);
  const json = await response.json();

  if (!response.ok || json.error) {
    return {
      error: json.error || `Request failed with status ${response.status}`,
      data: null,
    };
  }

  return { error: null, data: json };
}

export async function searchJobs(
  input: SearchInput,
): Promise<Result<SearchResponse>> {
  const { experienceYears: _experienceYears, ...body } = input;

  const response = await fetch(`${BASE_URL}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await response.json();

  if (!response.ok || json.error) {
    return {
      error: json.error || `Request failed with status ${response.status}`,
      data: null,
    };
  }

  return { error: null, data: json };
}

export async function getJobDetail(
  jobId: string,
): Promise<Result<{ job: JobDetail }>> {
  const response = await fetch(
    `${BASE_URL}/api/jobs/${encodeURIComponent(jobId)}`,
  );
  const json = await response.json();

  if (!response.ok || json.error) {
    return {
      error: json.error || `Request failed with status ${response.status}`,
      data: null,
    };
  }

  return { error: null, data: json };
}

export async function getJobMatch(
  jobId: string,
  input: Pick<SearchInput, "skills" | "skillNames" | "projectTexts">,
): Promise<Result<{ match: JobMatch }>> {
  const body: Pick<SearchInput, "skills" | "skillNames" | "projectTexts"> = {
    skills: input.skills,
    skillNames: input.skillNames,
    projectTexts: input.projectTexts,
  };

  const response = await fetch(
    `${BASE_URL}/api/jobs/${encodeURIComponent(jobId)}/match`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const json = await response.json();

  if (!response.ok || json.error) {
    return {
      error: json.error || `Request failed with status ${response.status}`,
      data: null,
    };
  }

  return { error: null, data: json };
}

export async function analyzeJobFit(
  jobId: string,
  input: JobAnalysisInput,
): Promise<Result<{ analysis: JobFitAnalysis }>> {
  const {
    experienceMinYears: _experienceMinYears,
    experienceMaxYears: _experienceMaxYears,
    ...body
  } = input;

  const response = await fetch(
    `${BASE_URL}/api/jobs/${encodeURIComponent(jobId)}/analysis`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const json = await response.json();

  if (!response.ok || json.error) {
    return {
      error: json.error || `Request failed with status ${response.status}`,
      data: null,
    };
  }

  return { error: null, data: json };
}
