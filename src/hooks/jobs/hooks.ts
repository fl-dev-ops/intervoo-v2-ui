import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import type {
  JobCard,
  JobFitAnalysis,
  JobMatch,
  SearchInput,
} from "@/lib/jd-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JobOption = { id?: string; name: string };
export type JobOptions = { companies: JobOption[] };
export type JobSort = NonNullable<SearchInput["sort"]>;

export type RoundStatus = {
  processingRoundIds: string[];
  readyRoundIds: string[];
  roundScores: Record<string, number | null>;
};

export type JobMatchResult = {
  match: JobMatch;
  hasAnalysisEvidence: boolean;
};

export type PostingStatus = "available" | "unavailable" | "unknown";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const jobsKeys = {
  all: ["jobs"] as const,
  options: () => [...jobsKeys.all, "options"] as const,
  search: (search: SearchInput) => [...jobsKeys.all, "search", search] as const,
  match: (jobId: string) => [...jobsKeys.all, jobId, "match"] as const,
  analysis: (jobId: string) => [...jobsKeys.all, jobId, "analysis"] as const,
  roundStatus: (jobId: string) =>
    [...jobsKeys.all, jobId, "round-status"] as const,
  sourceUrl: (url: string) => [...jobsKeys.all, "source-url", url] as const,
};

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

async function readJson<T>(response: Response, fallbackError: string) {
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok || !payload || payload.error) {
    throw new Error(payload?.error || fallbackError);
  }
  return payload as T;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Filter options (companies) for the job-preferences dialog. */
export function useJobOptions(
  options: { enabled?: boolean } = {},
): UseQueryResult<JobOptions> {
  return useQuery({
    queryKey: jobsKeys.options(),
    queryFn: async () => {
      const response = await fetch("/api/jobs/options");
      return readJson<JobOptions>(response, "Failed to load options");
    },
    // Options rarely change within a session.
    staleTime: 5 * 60_000,
    enabled: options.enabled ?? true,
  });
}

/** Job search results for a given filter+sort combination. */
export function useJobSearch(
  search: SearchInput,
  options: { enabled?: boolean } = {},
): UseQueryResult<JobCard[]> {
  return useQuery({
    queryKey: jobsKeys.search(search),
    queryFn: async () => {
      const response = await fetch("/api/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(search),
      });
      const payload = await readJson<{ cards?: JobCard[] }>(
        response,
        "Failed to search jobs",
      );
      return payload.cards ?? [];
    },
    enabled: options.enabled ?? true,
  });
}

/** Candidate↔job match score + whether there is enough evidence to analyse. */
export function useJobMatch(
  jobId: string | undefined,
): UseQueryResult<JobMatchResult> {
  return useQuery({
    queryKey: jobsKeys.match(jobId ?? ""),
    queryFn: async () => {
      const response = await fetch(
        `/api/jobs/${encodeURIComponent(jobId as string)}/match`,
        { cache: "no-store" },
      );
      const payload = await readJson<{
        match?: JobMatch;
        hasAnalysisEvidence?: boolean;
      }>(response, "Failed to load job match");
      if (!payload.match) throw new Error("Failed to load job match");
      return {
        match: payload.match,
        hasAnalysisEvidence: payload.hasAnalysisEvidence === true,
      };
    },
    enabled: Boolean(jobId),
  });
}

/**
 * Detailed fit analysis. Dependent on the match result: only runs once a match
 * exists and the match reported enough evidence to analyse.
 */
export function useJobAnalysis(
  jobId: string | undefined,
  match: JobMatch | undefined,
  options: { enabled?: boolean } = {},
): UseQueryResult<JobFitAnalysis> {
  return useQuery({
    queryKey: jobsKeys.analysis(jobId ?? ""),
    queryFn: async () => {
      const response = await fetch(
        `/api/jobs/${encodeURIComponent(jobId as string)}/analysis`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ match }),
        },
      );
      const payload = await readJson<{ analysis?: JobFitAnalysis }>(
        response,
        "Failed to load job fit analysis",
      );
      if (!payload.analysis) throw new Error("Failed to load job fit analysis");
      return payload.analysis;
    },
    enabled: Boolean(jobId) && Boolean(match) && (options.enabled ?? true),
  });
}

/**
 * Round report status. Polls every 2s while any round is still processing and
 * stops on its own once none are. Seed with server data via `initialData`.
 */
export function useRoundStatus(
  jobId: string,
  options: { enabled?: boolean; initialData?: RoundStatus } = {},
): UseQueryResult<RoundStatus> {
  return useQuery({
    queryKey: jobsKeys.roundStatus(jobId),
    queryFn: async () => {
      const response = await fetch(
        `/api/jobs/${encodeURIComponent(jobId)}/round-status`,
        { cache: "no-store" },
      );
      return readJson<RoundStatus>(response, "Failed to load round status");
    },
    enabled: options.enabled ?? true,
    initialData: options.initialData,
    refetchInterval: (query) =>
      (query.state.data?.processingRoundIds.length ?? 0) > 0 ? 2000 : false,
  });
}

/** Whether an original job posting URL is still reachable. */
export function useSourceUrlStatus(
  url: string | undefined,
): UseQueryResult<PostingStatus> {
  return useQuery({
    queryKey: jobsKeys.sourceUrl(url ?? ""),
    queryFn: async (): Promise<PostingStatus> => {
      const response = await fetch(
        `/api/jobs/check-url?url=${encodeURIComponent(url as string)}`,
      );
      if (!response.ok) return "unknown";
      const payload = (await response.json().catch(() => null)) as {
        status?: string;
      } | null;
      return payload?.status === "available" ||
        payload?.status === "unavailable"
        ? payload.status
        : "unknown";
    },
    enabled: Boolean(url),
    staleTime: 5 * 60_000,
    retry: false,
  });
}
