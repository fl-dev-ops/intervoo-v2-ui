import "server-only";

const BASE_URL =
  process.env.INTERVIEW_ROUNDS_API_URL ||
  "https://interview-rounds-prototype.vercel.app";

type Result<T> = { error: string; data: null } | { error: null; data: T };

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

export async function parseResume(
  file: File,
): Promise<Result<{ profile: OnboardingProfile }>> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BASE_URL}/api/onboarding/parse`, {
    method: "POST",
    body: formData,
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
