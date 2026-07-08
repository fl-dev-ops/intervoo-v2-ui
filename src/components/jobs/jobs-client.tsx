"use client";

import { IconEdit } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  BriefcaseBusiness,
  Check,
  Circle,
  CircleAlert,
  CircleDashed,
  LoaderCircle,
  Search,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import {
  JobPreferencesDialog,
  type JobProfileFilters,
} from "@/components/jobs/job-preferences-dialog";
import { ProfileEditDialog } from "@/components/profile/profile-edit-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type JobSort,
  jobsKeys,
  useJobOptions,
  useJobSearch,
} from "@/hooks/jobs/hooks";
import { getLogoText } from "@/lib/company";
import type { JobCard, SearchInput } from "@/lib/jd-client";
import {
  readStoredJobProfileFilters,
  writeStoredJobProfileFilters,
} from "@/lib/job-profile-filters";
import { JOB_ROLE_OPTIONS } from "@/lib/job-roles";
import {
  readStoredJobSort,
  writeStoredJobSort,
} from "@/lib/job-sort-preference";
import { cn } from "@/lib/utils";

type JobListCardBase = Pick<
  JobCard,
  | "companyName"
  | "experienceMaxYears"
  | "experienceMinYears"
  | "jobId"
  | "jobTitle"
>;

export type StartedJobCard = JobListCardBase & {
  roundProgress: {
    id: string;
    state: "completed" | "failed" | "generating" | "not-started" | "started";
    title: string;
  }[];
};

type JobsClientProps = {
  initialCards: JobCard[];
  initialError: string | null;
  initialSearch: SearchInput;
  startedJobs: StartedJobCard[];
  user: { email: string | null; name: string | null };
};

export function JobsClient({
  initialCards,
  initialError,
  initialSearch,
  startedJobs,
  user,
}: JobsClientProps) {
  const queryClient = useQueryClient();
  // `filters` is the draft the preferences dialog edits; `appliedFilters` is
  // what actually drives the search query (committed on Apply).
  const [filters, setFilters] = useState<JobProfileFilters>(() =>
    getDefaultFilters(initialSearch),
  );
  const [appliedFilters, setAppliedFilters] = useState<JobProfileFilters>(() =>
    getDefaultFilters(initialSearch),
  );
  const [sort, setSort] = useState<JobSort>(
    () => readStoredJobSort() ?? "default",
  );
  const [isJobPrefDialogOpen, setJobPrefDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [hasLoadedFilters, setHasLoadedFilters] = useState(false);
  const [hasSavedFilters, setHasSavedFilters] = useState(false);
  const [optionsEnabled, setOptionsEnabled] = useState(false);

  // Seed the server-rendered cards into the cache for the default filter combo
  // so the initial view renders without an extra fetch.
  useState(() => {
    queryClient.setQueryData(
      jobsKeys.search(
        buildSearchInput(
          getDefaultFilters(initialSearch),
          "default",
          initialSearch,
        ),
      ),
      initialCards,
    );
  });

  const searchInput = useMemo(
    () => buildSearchInput(appliedFilters, sort, initialSearch),
    [appliedFilters, sort, initialSearch],
  );
  const searchQuery = useJobSearch(searchInput, { enabled: hasLoadedFilters });
  const optionsQuery = useJobOptions({ enabled: optionsEnabled });

  const cards = searchQuery.data ?? [];
  const companyOptions = optionsQuery.data?.companies ?? [];
  const isSearching = searchQuery.isFetching;
  const error =
    (searchQuery.error instanceof Error ? searchQuery.error.message : null) ??
    (optionsQuery.error instanceof Error ? optionsQuery.error.message : null) ??
    (hasLoadedFilters ? null : initialError);

  const roleOptions = JOB_ROLE_OPTIONS;

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount to load saved filters
  useEffect(() => {
    const savedFilters = readStoredJobProfileFilters();
    if (!savedFilters) {
      // No saved preferences — show default results and open the dialog.
      setHasLoadedFilters(true);
      setHasSavedFilters(false);
      openJobPreferences();
      return;
    }

    setFilters(savedFilters);
    setAppliedFilters(savedFilters);
    setHasLoadedFilters(true);
    setHasSavedFilters(true);
    setJobsStep("jd-listing");
  }, []);

  function openJobPreferences() {
    setFilters(
      readStoredJobProfileFilters() ?? getDefaultFilters(initialSearch),
    );
    setJobPrefDialogOpen(true);
    setJobsStep("job-preferences");
    setOptionsEnabled(true);
  }

  function applyJobPreferences() {
    writeStoredJobProfileFilters(filters);
    setAppliedFilters(filters);
    setHasSavedFilters(true);
    setJobPrefDialogOpen(false);
    setJobsStep("jd-listing");
  }

  function changeSort(nextSort: JobSort) {
    if (nextSort === sort) return;
    writeStoredJobSort(nextSort);
    setSort(nextSort);
  }

  return (
    <main className="min-h-screen bg-[#F5F3F7] font-sans text-black">
      <AppHeader user={user} />
      <section className="mx-auto w-full max-w-225 px-4 pb-12 pt-6">
        {startedJobs.length > 0 && (
          <section className="mb-10" aria-labelledby="started-jobs-heading">
            <h2
              id="started-jobs-heading"
              className="text-xl font-bold font-serif tracking-tight text-[#353238]"
            >
              Continue with your interview
            </h2>
            <div className="mt-4 space-y-3">
              {startedJobs.map((card) => (
                <JobListCard key={card.jobId} card={card} />
              ))}
            </div>
          </section>
        )}

        <h1 className="text-xl font-bold font-serif tracking-tight text-[#353238]">
          Jobs matching your{" "}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="inline-flex items-center gap-1 underline underline-offset-2"
                />
              }
            >
              preference
              <IconEdit className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={8}
              className="w-48 rounded-xl border border-[#E5E2E7] bg-white p-2 shadow-[0_18px_45px_rgba(31,27,36,0.14)]"
            >
              <DropdownMenuItem
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#2F2B35]"
                onClick={() => void openJobPreferences()}
              >
                <UserRound className="size-4 text-[#56515A]" />
                Job preferences
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#2F2B35]"
                onClick={() => setIsProfileDialogOpen(true)}
              >
                <BriefcaseBusiness className="size-4 text-[#56515A]" />
                Profile edit
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </h1>

        <div className="mt-4 flex justify-end">
          <fieldset
            aria-label="Sort jobs"
            className="inline-grid grid-cols-2 rounded-xl bg-[#ECE8F1] p-1"
          >
            {(["default", "score"] as const).map((value) => (
              <button
                key={value}
                aria-pressed={sort === value}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-semibold text-[#2F2B35] transition",
                  sort === value && "bg-white shadow-sm",
                )}
                disabled={isSearching}
                type="button"
                onClick={() => void changeSort(value)}
              >
                {value === "default" ? "Role match" : "Skill match"}
              </button>
            ))}
          </fieldset>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-3">
          {!hasLoadedFilters || isSearching ? (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-[#E4E0E7] bg-white px-5 py-5 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="size-[72px] shrink-0 animate-pulse rounded-xl bg-[#E4E0E7]" />
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="h-4 w-28 animate-pulse rounded-md bg-[#E4E0E7]" />
                      <div className="h-6 w-3/4 animate-pulse rounded-md bg-[#E4E0E7]" />
                      <div className="flex gap-2">
                        <div className="h-6 w-24 animate-pulse rounded-full bg-[#E4E0E7]" />
                        <div className="h-6 w-20 animate-pulse rounded-full bg-[#E4E0E7]" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 w-full animate-pulse rounded-md bg-[#E4E0E7]" />
                        <div className="h-4 w-2/3 animate-pulse rounded-md bg-[#E4E0E7]" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : cards.length ? (
            cards.map((card) => <JobListCard key={card.jobId} card={card} />)
          ) : (
            <div className="rounded-2xl border border-[#E4E0E7] bg-white px-5 py-10 text-center shadow-sm">
              <Search className="mx-auto size-8 text-[#6D6873]" />
              <p className="mt-3 text-base font-bold">No matching jobs found</p>
              <p className="mt-1 text-sm text-[#6D6873]">
                Edit your preference filters and try again.
              </p>
            </div>
          )}
        </div>
      </section>

      {isJobPrefDialogOpen && (
        <JobPreferencesDialog
          canClose={hasSavedFilters}
          companyOptions={companyOptions.map((company) => company.name)}
          isApplying={isSearching}
          onApply={applyJobPreferences}
          onClose={() => {
            setJobPrefDialogOpen(false);
            setJobsStep("jd-listing");
          }}
          roleOptions={roleOptions}
          filters={filters}
          setFilters={setFilters}
        />
      )}

      <ProfileEditDialog
        onOpenChange={setIsProfileDialogOpen}
        onSaved={() => window.location.reload()}
        open={isProfileDialogOpen}
      />
    </main>
  );
}

function setJobsStep(step: "jd-listing" | "job-preferences") {
  const url = new URL(window.location.href);
  url.searchParams.set("step", step);
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}`,
  );
}

function JobListCard({ card }: { card: JobCard | StartedJobCard }) {
  const router = useRouter();
  const score = "score" in card ? normalizeScore(card.score) : null;
  const matchedSkills = "matchedSkills" in card ? card.matchedSkills : null;
  const totalSkills = "totalSkills" in card ? card.totalSkills : null;
  const hasScore = score !== null;
  const strongMatch = hasScore && score >= 80;
  const isStarted = "roundProgress" in card;

  return (
    <button
      type="button"
      onClick={() => router.push(`/jobs/${card.jobId}`)}
      className={cn(
        "grid w-full items-center gap-4 rounded-xl border px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        hasScore ? "grid-cols-[72px_1fr_60px]" : "grid-cols-[72px_1fr]",
        isStarted
          ? "border-[#E4E0E7] bg-white"
          : strongMatch
            ? "border-[#CBEDE0] bg-[#EFFFF8]"
            : "border-[#E9E2D9] bg-[#FFF9EF]",
      )}
    >
      <div className="flex size-16 items-center justify-center rounded-lg border border-[#DDD8DF] bg-white p-2 text-center text-sm font-extrabold leading-tight">
        {getLogoText(card.companyName)}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-black">
          {card.companyName}
        </p>
        <h2 className="mt-1 truncate text-base font-bold tracking-tight text-black">
          {card.jobTitle}
        </h2>
        <p className="mt-1 text-sm text-[#6D6873]">
          {formatJobMeta(card, matchedSkills, totalSkills)}
        </p>
        {"roundProgress" in card && (
          <div className="mt-3 flex flex-wrap gap-2">
            {card.roundProgress.map((round) => (
              <RoundProgressChip key={round.id} round={round} />
            ))}
          </div>
        )}
      </div>
      {hasScore && <ScoreRing score={score} />}
    </button>
  );
}

function RoundProgressChip({
  round,
}: {
  round: StartedJobCard["roundProgress"][number];
}) {
  const completed = round.state === "completed";
  const failed = round.state === "failed";
  const generating = round.state === "generating";
  const started = round.state === "started";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium",
              completed && "border-[#DDF2E8] bg-[#EAF8F1] text-[#176B4A]",
              failed && "border-red-200 bg-red-50 text-red-700",
              !completed &&
                !failed &&
                "border-[#E4E0E7] bg-white text-[#353238]",
            )}
          />
        }
      >
        {completed ? (
          <Check className="size-3.5" strokeWidth={2.5} />
        ) : failed ? (
          <CircleAlert className="size-3.5" />
        ) : generating ? (
          <LoaderCircle className="size-3.5 animate-spin" />
        ) : started ? (
          <CircleDashed className="size-3.5" />
        ) : (
          <Circle className="size-3.5" />
        )}
        {round.title}
      </TooltipTrigger>
      <TooltipContent>{getRoundProgressTooltip(round.state)}</TooltipContent>
    </Tooltip>
  );
}

function getRoundProgressTooltip(
  state: StartedJobCard["roundProgress"][number]["state"],
) {
  if (state === "completed") return "Report ready";
  if (state === "failed") return "Report generation failed. Retake this round.";
  if (state === "generating") return "Report is generating";
  if (state === "started") return "Interview started";
  return "Not started";
}

function ScoreRing({ score }: { score: number }) {
  return (
    <div
      className="grid size-12 place-items-center rounded-full text-xs font-extrabold text-black"
      style={{
        background: `conic-gradient(#3FB982 ${score * 3.6}deg, transparent 0deg)`,
      }}
    >
      <div className="grid size-11 place-items-center rounded-full bg-white">
        {score}%
      </div>
    </div>
  );
}

function normalizeScore(score: number | null) {
  if (score == null || Number.isNaN(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function formatJobMeta(
  card: JobListCardBase,
  matchedSkills: number | null,
  totalSkills: number | null,
) {
  const details = [
    formatExperience(card.experienceMinYears, card.experienceMaxYears),
    totalSkills == null ? "" : `${matchedSkills ?? 0}/${totalSkills} skills`,
  ].filter(Boolean);

  return details.join(" · ");
}

function formatExperience(min: number | null, max: number | null) {
  if (min == null && max == null) return "";
  if (min != null && max != null) return `${min}-${max} years`;
  if (min != null) return `${min}+ years`;
  return `Up to ${max} years`;
}

function getDefaultFilters(_initialSearch: SearchInput): JobProfileFilters {
  // Roles are intentionally NOT seeded from the resume role here. The resume
  // role is seeded once during onboarding and persisted; re-seeding on /jobs
  // would ignore the user having cleared it.
  return {
    companies: [],
    roles: [],
  };
}

// Builds the search payload from the applied filters + sort, carrying over the
// resume-derived fields (skills, projects) from the server's initial search.
function buildSearchInput(
  filters: JobProfileFilters,
  sort: JobSort,
  base: SearchInput,
): SearchInput {
  return {
    companyText: filters.companies.join(", "),
    roleText: filters.roles.join(", "),
    skills: base.skills,
    skillNames: base.skillNames,
    experienceYears: null,
    projectTexts: base.projectTexts ?? [],
    sort,
  };
}
