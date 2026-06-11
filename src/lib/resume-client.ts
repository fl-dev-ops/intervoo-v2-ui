import "server-only";

import { parseResume as parseResumeLocal } from "./resume-parser";

type Result<T> = { error: string; data: null } | { error: null; data: T };

export type { OnboardingProfile } from "./resume-parser";

export async function parseResume(
  file: File,
): Promise<Result<{ profile: import("./resume-parser").OnboardingProfile }>> {
  try {
    const profile = await parseResumeLocal(file);
    return { error: null, data: { profile } };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to parse resume",
      data: null,
    };
  }
}
