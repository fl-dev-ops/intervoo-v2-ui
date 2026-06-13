"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { IconEdit } from "@tabler/icons-react";
import { Search } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import {
  JobPreferencesDialog,
  type JobProfileFilters,
} from "@/components/jobs/job-preferences-dialog";
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
  skills: Option[];
};

export function JobsClient({
  initialCards,
  initialError,
  initialSearch,
  user,
}: JobsClientProps) {
  const [cards, setCards] = useState(initialCards);
  const [searchInput, setSearchInput] = useState<SearchInput>(initialSearch);
  const [options, setOptions] = useState<JobOptions>({
    companies: [],
    skills: [],
  });
  const [filters, setFilters] = useState<JobProfileFilters>(() => ({
    companies: [],
    roles: initialSearch.roleText ? [initialSearch.roleText] : [],
    salary: "",
    skills: initialSearch.skillNames,
  }));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(initialError);
  const [hasLoadedFilters, setHasLoadedFilters] = useState(false);
  const [hasSavedFilters, setHasSavedFilters] = useState(false);

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
      void searchWithFilters(filters, { closeDialog: false });
      void openProfileDialog();
      return;
    }

    setFilters(savedFilters);
    setHasLoadedFilters(true);
    setHasSavedFilters(true);
    void searchWithFilters(savedFilters, { closeDialog: false });
  }, []);

  async function openProfileDialog() {
    setIsDialogOpen(true);

    if (options.companies.length || options.skills.length || isLoadingOptions) {
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
        skills: payload.skills ?? [],
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
    { closeDialog }: { closeDialog: boolean },
  ) {
    const nextSearch: SearchInput = {
      ...searchInput,
      companyText: nextFilters.companies.join(", "),
      roleText: nextFilters.roles.join(", "),
      skillNames: nextFilters.skills,
      sort: "score",
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
      setSearchInput(nextSearch);
      if (closeDialog) setIsDialogOpen(false);
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

  async function applyProfile() {
    writeStoredFilters(filters);
    await searchWithFilters(filters, { closeDialog: true });
  }

  return (
    <main className="min-h-screen bg-[#F5F3F7] font-sans text-black">
      <AppHeader user={user} />
      <section className="mx-auto w-full max-w-225 px-4 pb-12 pt-6">
        <h1 className="text-lg font-extrabold tracking-tight text-[#353238]">
          Jobs matching your{" "}
          <button
            type="button"
            onClick={openProfileDialog}
            className="inline-flex items-center gap-1 underline underline-offset-2"
          >
            preference
            <IconEdit className="size-4" />
          </button>
        </h1>

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

      {isDialogOpen && (
        <ProfileDialog
          canClose={hasSavedFilters}
          companyOptions={options.companies.map((company) => company.name)}
          onApply={applyProfile}
          onClose={() => setIsDialogOpen(false)}
          roleOptions={roleOptions}
          filters={filters}
          setFilters={setFilters}
          skillOptions={options.skills.map((skill) => skill.name)}
        />
      )}
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

function ProfileDialog(props: {
  canClose?: boolean;
  companyOptions: string[];
  filters: JobProfileFilters;
  onApply: () => void;
  onClose: () => void;
  roleOptions: string[];
  setFilters: (
    value: JobProfileFilters | ((prev: JobProfileFilters) => JobProfileFilters),
  ) => void;
  skillOptions: string[];
}) {
  return <JobPreferencesDialog {...props} />;
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
  const normalized = score <= 1 ? score * 100 : score;
  return Math.max(0, Math.min(100, Math.round(normalized)));
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

function getLogoText(companyName: string) {
  const words = companyName.split(/\s+/).filter(Boolean);
  if (!words.length) return "J";
  return words[0][0].toUpperCase();
}

function readStoredFilters(): JobProfileFilters | null {
  try {
    const raw = window.localStorage.getItem(JOB_PROFILE_FILTERS_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<JobProfileFilters>;
    return {
      companies: Array.isArray(parsed.companies) ? parsed.companies : [],
      roles: Array.isArray(parsed.roles) ? parsed.roles : [],
      salary: typeof parsed.salary === "string" ? parsed.salary : "",
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    };
  } catch {
    return null;
  }
}

function writeStoredFilters(filters: JobProfileFilters) {
  window.localStorage.setItem(JOB_PROFILE_FILTERS_KEY, JSON.stringify(filters));
}
