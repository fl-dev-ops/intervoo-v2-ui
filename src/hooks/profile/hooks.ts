import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { jobsKeys } from "@/hooks/jobs/hooks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Raw `/api/profile` GET payload. Consumers map this into their own drafts. */
export type ProfileApiResponse = {
  name?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  resume?: {
    name?: string | null;
    role?: string | null;
    experienceYears?: number | null;
    education?: unknown[];
    skills?: string[];
    experience?: unknown[];
    projects?: unknown[];
  } | null;
  error?: string;
};

/** Body accepted by the profile-update (`PUT /api/profile`) path. */
export type ProfileUpdatePayload = {
  name: string;
  email: string;
  phoneNumber?: string;
  role: string;
  experienceYears: number | null;
  education: unknown[];
  skills: string[];
  experience: unknown[];
  projects: unknown[];
};

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const profileKeys = {
  all: ["profile"] as const,
  detail: () => [...profileKeys.all, "detail"] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** The signed-in user's profile + resume. */
export function useProfile(
  options: { enabled?: boolean } = {},
): UseQueryResult<ProfileApiResponse> {
  return useQuery({
    queryKey: profileKeys.detail(),
    queryFn: async () => {
      const response = await fetch("/api/profile", { cache: "no-store" });
      const payload = (await response
        .json()
        .catch(() => null)) as ProfileApiResponse | null;
      if (!response.ok || !payload) {
        throw new Error(payload?.error || "Failed to load profile");
      }
      return payload;
    },
    enabled: options.enabled ?? true,
  });
}

/**
 * Update the profile (`PUT /api/profile`). Body shape varies by caller
 * (profile fields vs `{ action: "replace-resume", ... }`), so it is passed
 * through as-is. Invalidates the profile and any job-match caches on success.
 */
export function useUpdateProfile(): UseMutationResult<
  unknown,
  Error,
  ProfileUpdatePayload
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: ProfileUpdatePayload) => {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to save profile");
      }
      return payload;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.detail() });
      // Skills/experience edits change the match score.
      void queryClient.invalidateQueries({ queryKey: jobsKeys.all });
    },
  });
}
