import type { JobSort } from "@/hooks/jobs/hooks";

export const JOB_SORT_KEY = "intervoo:job-sort";

const JOB_SORTS: readonly JobSort[] = ["default", "score"];

function isJobSort(value: unknown): value is JobSort {
  return typeof value === "string" && (JOB_SORTS as string[]).includes(value);
}

export function readStoredJobSort(): JobSort | null {
  try {
    const raw = window.sessionStorage.getItem(JOB_SORT_KEY);
    return isJobSort(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeStoredJobSort(sort: JobSort) {
  try {
    window.sessionStorage.setItem(JOB_SORT_KEY, sort);
  } catch {
    // Ignore storage failures (e.g. private mode quota).
  }
}
