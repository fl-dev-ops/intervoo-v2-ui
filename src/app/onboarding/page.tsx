"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import {
  ResumeUploadStep,
  ResumeReviewStep,
} from "@/components/onboarding";
import { AppHeader } from "@/components/app-header";
import { JobPreferencesDialog, type JobProfileFilters } from "@/components/jobs/job-preferences-dialog";
import { authClient } from "@/lib/auth-client";

type ResumeData = {
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  experienceYears: number | null;
  education: {
    degree: string;
    stream: string;
    institution: string;
    graduationYear: string;
    score: string;
  }[];
  skills: string[];
  experience: {
    title: string;
    company: string;
    startDate: string;
    endDate: string;
    description: string;
  }[];
  projects: {
    title: string;
    description: string;
  }[];
  // Rich matching fields — parsed once, carried through untouched (not edited
  // in the review UI), index-aligned with skills/projects/experience.
  skillGlosses?: Record<string, string>;
  projectKeywords?: string[][];
  projectCapabilities?: string[][];
  workInitiatives?: string[][];
};

type UserDefaults = {
  name: string;
  email: string;
  phoneNumber: string;
};

type Option = { id?: string; name: string };

const JOB_PROFILE_FILTERS_KEY = "intervoo:job-profile-filters";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"upload" | "review" | "preferences">("upload");
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userDefaults, setUserDefaults] = useState<UserDefaults>({
    name: "",
    email: "",
    phoneNumber: "",
  });
  const [options, setOptions] = useState<{ companies: Option[]; skills: Option[] }>({ companies: [], skills: [] });
  const [filters, setFilters] = useState<JobProfileFilters>({
    companies: [],
    roles: [],
    salary: "",
    skills: [],
  });
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const checkStage = async () => {
      try {
        const response = await fetch("/api/onboarding/me");
        if (!response.ok) {
          router.push("/login");
          return;
        }
        const data = await response.json();
        if (data.stage !== "ONBOARDING") {
          router.push("/diagnostics");
          return;
        }
        setUserDefaults({
          name: data.name || "",
          email: data.email || "",
          phoneNumber: data.phoneNumber || "",
        });
      } catch {
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkStage();
  }, [router]);

  const handleParseResume = useCallback(async (file: File) => {
    setIsParsing(true);
    setParseError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/onboarding/parse-resume", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to parse resume");
      }

      const data = await response.json();
      const merged = mergeWithUserDefaults(data.resume, userDefaults);
      setResumeData(merged);
      setFilters({
        companies: [],
        roles: merged.role ? [merged.role] : [],
        salary: "",
        skills: merged.skills,
      });
      setStep("review");
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : "Failed to parse resume",
      );
    } finally {
      setIsParsing(false);
    }
  }, [userDefaults]);

  const handleSkip = useCallback(() => {
    setResumeData({
      name: "",
      email: "",
      phoneNumber: userDefaults.phoneNumber,
      role: "",
      experienceYears: null,
      education: [],
      skills: [],
      experience: [],
      projects: [],
    });
    setStep("review");
  }, [userDefaults]);

  const loadOptions = useCallback(async () => {
    setIsLoadingOptions(true);
    try {
      const response = await fetch("/api/jobs/options");
      const payload = (await response.json()) as { companies?: Option[]; skills?: Option[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to load options");
      setOptions({
        companies: payload.companies ?? [],
        skills: payload.skills ?? [],
      });
    } catch {
      // silently fail
    } finally {
      setIsLoadingOptions(false);
    }
  }, []);

  const handleComplete = useCallback(
    async (data: ResumeData) => {
      setIsCompleting(true);

      try {
        // Rich matching fields aren't edited in review — source them from the
        // parsed resume so they survive regardless of review-step edits.
        const payload = {
          ...data,
          skillGlosses: resumeData?.skillGlosses ?? {},
          projectKeywords: resumeData?.projectKeywords ?? [],
          projectCapabilities: resumeData?.projectCapabilities ?? [],
          workInitiatives: resumeData?.workInitiatives ?? [],
        };
        const response = await fetch("/api/onboarding/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to complete onboarding");
        }

        setStep("preferences");
        void loadOptions();
      } catch (err) {
        setParseError(
          err instanceof Error ? err.message : "Failed to complete onboarding",
        );
      } finally {
        setIsCompleting(false);
      }
    },
    [loadOptions, resumeData],
  );

  const handleApplyPreferences = useCallback(() => {
    setIsSearching(true);
    try {
      localStorage.setItem(JOB_PROFILE_FILTERS_KEY, JSON.stringify(filters));
    } catch {
      // ignore
    }
    router.push("/diagnostics");
  }, [filters, router]);

  const handleSkipPreferences = useCallback(() => {
    router.push("/diagnostics");
  }, [router]);

  const handleLogout = useCallback(async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push("/login"),
      },
    });
  }, [router]);

  const roleOptions = (() => {
    const names = new Set<string>();
    if (filters.roles) filters.roles.forEach((r) => names.add(r));
    if (resumeData?.role) names.add(resumeData.role);
    return [...names].sort();
  })();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F1FF] font-sans">
      <AppHeader onLogout={handleLogout} />
      {step === "upload" ? (
        <ResumeUploadStep
          onParse={handleParseResume}
          onSkip={handleSkip}
          isParsing={isParsing}
          error={parseError}
        />
      ) : step === "review" ? (
        resumeData && (
          <ResumeReviewStep
            initialData={resumeData}
            onComplete={handleComplete}
            onBack={() => setStep("upload")}
            isCompleting={isCompleting}
          />
        )
      ) : (
        <JobPreferencesDialog
          companyOptions={options.companies.map((c) => c.name)}
          filters={filters}
          isLoading={isSearching || isLoadingOptions}
          onApply={handleApplyPreferences}
          onClose={handleSkipPreferences}
          roleOptions={roleOptions}
          setFilters={setFilters}
          skillOptions={options.skills.map((s) => s.name)}
        />
      )}
    </div>
  );
}

function mergeWithUserDefaults(
  resume: ResumeData,
  defaults: UserDefaults,
): ResumeData {
  return {
    ...resume,
    name: resume.name || defaults.name || "",
    email: resume.email || defaults.email || "",
    phoneNumber: resume.phoneNumber || defaults.phoneNumber,
  };
}
