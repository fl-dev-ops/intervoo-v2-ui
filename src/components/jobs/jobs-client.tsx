"use client";

import { IconEdit } from "@tabler/icons-react";
import { BriefcaseBusiness, Search, UserRound } from "lucide-react";
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
import { getLogoText } from "@/lib/company";
import type { JobCard, SearchInput } from "@/lib/jd-client";
import { cn } from "@/lib/utils";

const JOB_PROFILE_FILTERS_KEY = "intervoo:job-profile-filters";

type Option = { id?: string; name: string };

type JobsClientProps = {
  initialCards: JobCard[];
  initialError: string | null;
  initialSearch: SearchInput;
  user: { email: string | null; name: string | null };
};

type JobOptions = {
  companies: Option[];
};

type JobSort = NonNullable<SearchInput["sort"]>;

export function JobsClient({
  initialCards,
  initialError,
  initialSearch,
  user,
}: JobsClientProps) {
  const [cards, setCards] = useState(initialCards);
  const [options, setOptions] = useState<JobOptions>({
    companies: [],
  });
  const [filters, setFilters] = useState<JobProfileFilters>(() =>
    getDefaultFilters(initialSearch),
  );
  const [isJobPrefDialogOpen, setJobPrefDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(initialError);
  const [hasLoadedFilters, setHasLoadedFilters] = useState(false);
  const [hasSavedFilters, setHasSavedFilters] = useState(false);
  const [sort, setSort] = useState<JobSort>("default");

  const roleOptions = useMemo(() => {
    const names = new Set(cards.map((card) => card.jobTitle).filter(Boolean));
    filters.roles.forEach((role) => names.add(role));
    return [...names].sort();
  }, [cards, filters.roles]);

  useEffect(() => {
    const savedFilters = readStoredFilters();
    if (!savedFilters) {
      // No saved preferences — search with profile defaults and open dialog
      setHasLoadedFilters(true);
      setHasSavedFilters(false);
      void searchWithFilters(filters);
      void openJobPreferences();
      return;
    }

    setFilters(savedFilters);
    setHasLoadedFilters(true);
    setHasSavedFilters(true);
    void searchWithFilters(savedFilters);
  }, []);

  async function openJobPreferences() {
    setFilters(readStoredFilters() ?? getDefaultFilters(initialSearch));
    setJobPrefDialogOpen(true);

    if (options.companies.length || isLoadingOptions) {
      return;
    }

    setIsLoadingOptions(true);
    try {
      const response = await fetch("/api/jobs/options");
      const payload = (await response.json()) as JobOptions & {
        error?: string;
      };

      if (!response.ok)
        throw new Error(payload.error ?? "Failed to load options");
      setOptions({
        companies: payload.companies ?? [],
      });
    } catch (optionsError) {
      setError(
        optionsError instanceof Error
          ? optionsError.message
          : "Failed to load options",
      );
    } finally {
      setIsLoadingOptions(false);
    }
  }

  async function searchWithFilters(
    nextFilters: JobProfileFilters,
    { sortBy = sort }: { sortBy?: JobSort } = {},
  ) {
    const nextSearch: SearchInput = {
      companyText: nextFilters.companies.join(", "),
      roleText: nextFilters.roles.join(", "),
      skills: initialSearch.skills,
      skillNames: initialSearch.skillNames,
      experienceYears: null,
      projectTexts: initialSearch.projectTexts ?? [],
      sort: sortBy,
    };

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch("/api/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextSearch),
      });
      const payload = (await response.json()) as {
        cards?: JobCard[];
        error?: string;
      };

      if (!response.ok)
        throw new Error(payload.error ?? "Failed to search jobs");
      setCards(payload.cards ?? []);
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Failed to search jobs",
      );
    } finally {
      setIsSearching(false);
    }
  }

  async function applyJobPreferences() {
    writeStoredFilters(filters);
    setHasSavedFilters(true);
    setJobPrefDialogOpen(false);
    await searchWithFilters(filters);
  }

  async function changeSort(nextSort: JobSort) {
    if (nextSort === sort) return;
    setSort(nextSort);
    await searchWithFilters(filters, {
      sortBy: nextSort,
    });
  }

  return (
    <main className="min-h-screen bg-[#F5F3F7] font-sans text-black">
      <AppHeader user={user} />
      <section className="mx-auto w-full max-w-225 px-4 pb-12 pt-6">
        <h1 className="text-2xl font-extrabold font-serif tracking-tight text-[#353238]">
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
          companyOptions={options.companies.map((company) => company.name)}
          isApplying={isSearching}
          onApply={applyJobPreferences}
          onClose={() => setJobPrefDialogOpen(false)}
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

function JobListCard({ card }: { card: JobCard }) {
  const router = useRouter();
  const score = normalizeScore(card.score);
  const strongMatch = score >= 80;

  return (
    <button
      type="button"
      onClick={() => router.push(`/jobs/${card.jobId}`)}
      className={cn(
        "grid w-full grid-cols-[72px_1fr_60px] items-center gap-4 rounded-xl border px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        strongMatch
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
        <h2 className="mt-1 truncate text-base font-extrabold tracking-tight text-black">
          {card.jobTitle}
        </h2>
        <p className="mt-1 text-sm text-[#6D6873]">{formatJobMeta(card)}</p>
      </div>
      <ScoreRing score={score} />
    </button>
  );
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

function formatJobMeta(card: JobCard) {
  const details = [
    formatExperience(card.experienceMinYears, card.experienceMaxYears),
    `${card.matchedSkills ?? 0}/${card.totalSkills} skills`,
  ].filter(Boolean);

  return details.join(" · ");
}

function formatExperience(min: number | null, max: number | null) {
  if (min == null && max == null) return "";
  if (min != null && max != null) return `${min}-${max} years`;
  if (min != null) return `${min}+ years`;
  return `Up to ${max} years`;
}

function readStoredFilters(): JobProfileFilters | null {
  try {
    const raw = window.localStorage.getItem(JOB_PROFILE_FILTERS_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<JobProfileFilters>;
    return {
      companies: Array.isArray(parsed.companies) ? parsed.companies : [],
      roles: Array.isArray(parsed.roles) ? parsed.roles : [],
    };
  } catch {
    return null;
  }
}

function getDefaultFilters(initialSearch: SearchInput): JobProfileFilters {
  return {
    companies: [],
    roles: initialSearch.roleText ? [initialSearch.roleText] : [],
  };
}

function writeStoredFilters(filters: JobProfileFilters) {
  window.localStorage.setItem(JOB_PROFILE_FILTERS_KEY, JSON.stringify(filters));
}
