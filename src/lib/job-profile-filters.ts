import { z } from "zod";

export const JOB_PROFILE_FILTERS_KEY = "intervoo:job-profile-filters";

const jobProfileFiltersSchema = z.object({
  companies: z.array(z.string()),
  roles: z.array(z.string()),
});

export type JobProfileFilters = z.infer<typeof jobProfileFiltersSchema>;

export function parseJobProfileFilters(value: unknown) {
  const result = jobProfileFiltersSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function readStoredJobProfileFilters(): JobProfileFilters | null {
  try {
    const raw = window.localStorage.getItem(JOB_PROFILE_FILTERS_KEY);
    if (!raw) return null;

    return parseJobProfileFilters(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeStoredJobProfileFilters(filters: JobProfileFilters) {
  window.localStorage.setItem(JOB_PROFILE_FILTERS_KEY, JSON.stringify(filters));
}
