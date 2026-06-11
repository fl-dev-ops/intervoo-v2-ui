"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { IconChevronDown, IconEdit, IconX } from "@tabler/icons-react";
import { LoaderCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
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

type JobProfileFilters = {
  companies: string[];
  roles: string[];
  salary: string;
  skills: string[];
};

export function JobsClient({
  initialCards,
  initialError,
  initialSearch,
  user,
}: JobsClientProps) {
  const [cards, setCards] = useState(initialCards);
  const [searchInput, setSearchInput] = useState<SearchInput>(initialSearch);
  const [options, setOptions] = useState<JobOptions>({ companies: [], skills: [] });
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

  const roleOptions = useMemo(() => {
    const names = new Set(cards.map((card) => card.jobTitle).filter(Boolean));
    filters.roles.forEach((role) => names.add(role));
    return [...names].sort();
  }, [cards, filters.roles]);

  useEffect(() => {
    const savedFilters = readStoredFilters();
    if (!savedFilters) {
      setHasLoadedFilters(true);
      return;
    }

    setFilters(savedFilters);
    setHasLoadedFilters(true);
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
      const payload = (await response.json()) as JobOptions & { error?: string };

      if (!response.ok) throw new Error(payload.error ?? "Failed to load options");
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
      const payload = (await response.json()) as { cards?: JobCard[]; error?: string };

      if (!response.ok) throw new Error(payload.error ?? "Failed to search jobs");
      setCards(payload.cards ?? []);
      setSearchInput(nextSearch);
      if (closeDialog) setIsDialogOpen(false);
    } catch (searchError) {
      setError(
        searchError instanceof Error ? searchError.message : "Failed to search jobs",
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
      <JobsHeader user={user} />
      <section className="mx-auto w-full max-w-[900px] px-4 pb-12 pt-6">
        <h1 className="text-lg font-extrabold tracking-tight text-[#353238]">
          Jobs matching your{" "}
          <button
            type="button"
            onClick={openProfileDialog}
            className="inline-flex items-center gap-1 underline underline-offset-2"
          >
            profile
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
            <div className="rounded-2xl border border-[#E4E0E7] bg-white px-5 py-10 text-center shadow-sm">
              <LoaderCircle className="mx-auto size-7 animate-spin text-[#6D6873]" />
              <p className="mt-3 text-base font-bold">Loading job matches</p>
            </div>
          ) : cards.length ? (
            cards.map((card) => (
              <JobListCard key={card.jobId} card={card} />
            ))
          ) : (
            <div className="rounded-2xl border border-[#E4E0E7] bg-white px-5 py-10 text-center shadow-sm">
              <Search className="mx-auto size-8 text-[#6D6873]" />
              <p className="mt-3 text-base font-bold">No matching jobs found</p>
              <p className="mt-1 text-sm text-[#6D6873]">
                Edit your profile filters and try again.
              </p>
            </div>
          )}
        </div>
      </section>

      {isDialogOpen && (
        <ProfileDialog
          companyOptions={options.companies.map((company) => company.name)}
          isLoading={isLoadingOptions || isSearching}
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

function JobsHeader({ user }: { user: { email: string | null; name: string | null } }) {
  return (
    <header className="border-b border-[#EDEAF0] bg-white">
      <div className="mx-auto flex h-[72px] w-full max-w-[1080px] items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Image
            src="/intervoo-logo-light.svg"
            alt="Intervoo"
            width={38}
            height={22}
            className="brightness-0"
            priority
          />
          <div className="hidden leading-none sm:block">
            <p className="text-base font-extrabold tracking-tight text-black">
              Intervoo.ai
            </p>
            <p className="mt-1 text-xs text-black/80">by Foreverlearning.in</p>
          </div>
        </div>
        <div className="flex size-9 items-center justify-center rounded-full bg-[#242225] text-sm font-bold text-white">
          {getInitial(user)}
        </div>
      </div>
    </header>
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
        "grid w-full grid-cols-[72px_1fr_54px] items-center gap-4 rounded-xl border px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
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
        <p className="mt-1 text-sm text-[#6D6873]">
          {formatJobMeta(card)}
        </p>
      </div>
      <ScoreRing score={score} />
    </button>
  );
}

function ProfileDialog({
  companyOptions,
  filters,
  isLoading,
  onApply,
  onClose,
  roleOptions,
  setFilters,
  skillOptions,
}: {
  companyOptions: string[];
  filters: JobProfileFilters;
  isLoading: boolean;
  onApply: () => void;
  onClose: () => void;
  roleOptions: string[];
  setFilters: (value: JobProfileFilters | ((prev: JobProfileFilters) => JobProfileFilters)) => void;
  skillOptions: string[];
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F7F1FF] px-4 py-6">
      <div className="mx-auto flex min-h-full w-full max-w-[600px] flex-col">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#827B89]">
              Job preferences
            </p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight">
              Your job preferences
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full bg-white text-black shadow-sm"
            aria-label="Close filters"
          >
            <IconX className="size-5" />
          </button>
        </div>

        <div className="mt-6 rounded-[22px] border border-[#E4DDEC] bg-white p-6 shadow-[0_24px_70px_rgba(58,37,109,0.08)]">
          <p className="text-sm font-extrabold uppercase tracking-wide text-black">
            Job Preference
          </p>
          <div className="mt-6 space-y-4">
          <MultiDropdown
            label="Role"
            options={roleOptions}
            placeholder="Select roles"
            selected={filters.roles}
            onChange={(roles) => setFilters((prev) => ({ ...prev, roles }))}
          />
          <MultiDropdown
            label="Company"
            options={companyOptions}
            placeholder="Select companies"
            selected={filters.companies}
            onChange={(companies) =>
              setFilters((prev) => ({ ...prev, companies }))
            }
          />
          <SalarySection
            salary={filters.salary}
            setSalary={(salary) => setFilters((prev) => ({ ...prev, salary }))}
          />
          <MultiDropdown
            label="Skills"
            options={skillOptions}
            placeholder="Select skills"
            selected={filters.skills}
            onChange={(skills) => setFilters((prev) => ({ ...prev, skills }))}
          />
          </div>
        </div>

        <div className="sticky bottom-0 mt-auto grid grid-cols-[1fr_1.35fr] gap-4 bg-[#F7F1FF] py-6">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="h-12 rounded-full bg-white/70 text-base font-bold text-[#5A5562]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onApply}
            disabled={isLoading}
            className="h-12 rounded-full bg-gradient-to-r from-[#5436B8] to-[#7149F6] text-base font-bold text-white"
          >
            {isLoading ? (
              <>
                <LoaderCircle className="mr-2 size-4 animate-spin" />
                Applying
              </>
            ) : (
              "Check job match"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MultiDropdown({
  label,
  onChange,
  options,
  placeholder,
  selected,
}: {
  label: string;
  onChange: (value: string[]) => void;
  options: string[];
  placeholder: string;
  selected: string[];
}) {
  const [open, setOpen] = useState(false);
  const visibleOptions = [...new Set([...selected, ...options])].filter(Boolean);
  const summary = selected.length ? selected.join(", ") : placeholder;

  return (
    <section className="relative">
      <label className="text-sm text-[#6D6873]">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="mt-1 flex h-12 w-full items-center justify-between rounded-lg border border-[#D8D5DD] bg-white px-3 text-left text-base text-black outline-none transition focus:border-[#6846E8] focus:ring-2 focus:ring-[#6846E8]/15"
      >
        <span className={cn("truncate", !selected.length && "text-[#8A8590]")}>{summary}</span>
        <IconChevronDown className={cn("size-5 shrink-0 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-20 mt-2 max-h-64 overflow-y-auto rounded-xl border border-[#E3DDF0] bg-white p-2 shadow-xl">
          {visibleOptions.length ? (
            visibleOptions.map((option) => {
              const isSelected = selected.includes(option);
              return (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-[#F7F1FF]"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() =>
                      onChange(
                        isSelected
                          ? selected.filter((item) => item !== option)
                          : [...selected, option],
                      )
                    }
                    className="size-4 accent-[#5C3BD8]"
                  />
                  <span className="min-w-0 truncate">{option}</span>
                </label>
              );
            })
          ) : (
            <p className="px-3 py-2 text-sm text-[#6D6873]">
              No options available yet.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function SalarySection({
  salary,
  setSalary,
}: {
  salary: string;
  setSalary: (value: string) => void;
}) {
  const salaryOptions = ["", "₹6-10 LPA", "₹8-15 LPA", "₹15-25 LPA", "₹25 LPA+"];

  return (
    <section>
      <label className="text-sm text-[#6D6873]">
        Salary
      </label>
      <select
        value={salary}
        onChange={(event) => setSalary(event.target.value)}
        className="mt-1 h-12 w-full rounded-lg border border-[#D8D5DD] bg-white px-3 text-base text-black outline-none transition focus:border-[#6846E8] focus:ring-2 focus:ring-[#6846E8]/15"
      >
        {salaryOptions.map((option) => (
          <option key={option || "any"} value={option}>
            {option || "Any salary"}
          </option>
        ))}
      </select>
    </section>
  );
}

function ScoreRing({ score }: { score: number }) {
  return (
    <div
      className="grid size-12 place-items-center rounded-full text-sm font-extrabold text-black"
      style={{
        background: `conic-gradient(#3FB982 ${score * 3.6}deg, transparent 0deg)`,
      }}
    >
      <div className="grid size-10 place-items-center rounded-full bg-white">
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

function getInitial(user: { email: string | null; name: string | null }) {
  const source = user.name?.trim() || user.email?.trim() || "U";
  return source.charAt(0).toUpperCase();
}

function getLogoText(companyName: string) {
  const words = companyName.split(/\s+/).filter(Boolean);
  if (!words.length) return "JOB";
  if (words.length === 1) return words[0].slice(0, 6);
  return words.slice(0, 2).map((word) => word[0]).join("");
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
