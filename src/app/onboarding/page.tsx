"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import {
  JobPreferencesForm,
  type JobProfileFilters,
} from "@/components/jobs/job-preferences-form";
import {
  ResumeParsingSkeleton,
  ResumeReviewStep,
  ResumeUploadStep,
} from "@/components/onboarding";
import { Spinner } from "@/components/ui/spinner";
import {
  parseJobProfileFilters,
  writeStoredJobProfileFilters,
} from "@/lib/job-profile-filters";
import type { ResumeData, ResumeSection } from "@/lib/resume-client";
import {
  type OnboardingResumePayload,
  onboardingResumePayloadSchema,
} from "@/lib/resume-schema";
import { uploadAndParseResume } from "@/lib/resume-upload-client";

type UserDefaults = {
  name: string;
  email: string;
  phoneNumber: string;
};

const PENDING_PROFILE_KEY = "intervoo:pending-onboarding-profile";
const PENDING_FILTERS_KEY = "intervoo:pending-onboarding-filters";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<
    "upload" | "review" | "job-preferences"
  >("upload");
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | undefined>();
  const [loadedSections, setLoadedSections] = useState<ResumeSection[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [pendingProfile, setPendingProfile] =
    useState<OnboardingResumePayload | null>(null);
  const [companyOptions, setCompanyOptions] = useState<string[]>([]);
  const [jobFilters, setJobFilters] = useState<JobProfileFilters>({
    companies: [],
    roles: [],
  });
  const [parseError, setParseError] = useState<string | null>(null);
  const [preferenceError, setPreferenceError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userDefaults, setUserDefaults] = useState<UserDefaults>({
    name: "",
    email: "",
    phoneNumber: "",
  });

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
          router.push("/jobs");
          return;
        }
        setUserDefaults({
          name: data.name || "",
          email: getUserFacingEmail(data.email || ""),
          phoneNumber: data.phoneNumber || "",
        });

        const restoredProfile = readPendingProfile();
        if (restoredProfile) {
          const restoredFilters = readPendingFilters() ?? {
            companies: [],
            roles: restoredProfile.role.trim()
              ? [restoredProfile.role.trim()]
              : [],
          };
          setPendingProfile(restoredProfile);
          setJobFilters(restoredFilters);
          setStep("job-preferences");

          try {
            setCompanyOptions(await fetchCompanyOptions());
          } catch (error) {
            setPreferenceError(
              error instanceof Error
                ? error.message
                : "Could not load company suggestions",
            );
          }
        }
      } catch {
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkStage();
  }, [router]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const urlStep =
      step === "review"
        ? "resume-details"
        : step === "job-preferences"
          ? "job-preferences"
          : "resume-upload";
    if (url.searchParams.get("step") === urlStep) return;
    url.searchParams.set("step", urlStep);
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  }, [router, step]);

  useEffect(() => {
    if (step !== "job-preferences" || !pendingProfile) return;
    window.sessionStorage.setItem(
      PENDING_FILTERS_KEY,
      JSON.stringify(jobFilters),
    );
  }, [jobFilters, pendingProfile, step]);

  const handleParseResume = useCallback(
    async (file: File) => {
      setIsParsing(true);
      setParseError(null);
      setLoadedSections([]);
      setResumeData(createEmptyResume(userDefaults));
      setResumeUrl(undefined);

      try {
        const result = await uploadAndParseResume(file, {
          async onEvent(event) {
            if (event.type === "section") {
              setResumeData((current) => ({
                ...(current ?? createEmptyResume(userDefaults)),
                ...event.data,
              }));
              setLoadedSections((current) =>
                current.includes(event.section)
                  ? current
                  : [...current, event.section],
              );
              await waitForPaint();
              return;
            }
          },
        });

        setResumeUrl(result.resumeUrl);
        setResumeData(mergeWithUserDefaults(result.resume, userDefaults));

        await waitForFinalSection();
        setIsParsing(false);
        setStep("review");
      } catch (err) {
        setParseError(
          err instanceof Error ? err.message : "Failed to parse resume",
        );
        setIsParsing(false);
      }
    },
    [userDefaults],
  );

  const handleSkip = useCallback(() => {
    setResumeUrl(undefined);
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

  const handleComplete = useCallback(
    async (data: ResumeData) => {
      setIsCompleting(true);
      setParseError(null);

      try {
        const payload = {
          ...data,
          skillGlosses: resumeData?.skillGlosses ?? {},
          projectKeywords: resumeData?.projectKeywords ?? [],
          projectCapabilities: resumeData?.projectCapabilities ?? [],
          workInitiatives: resumeData?.workInitiatives ?? [],
          resumeUrl,
        };
        setPendingProfile(payload);
        window.sessionStorage.setItem(
          PENDING_PROFILE_KEY,
          JSON.stringify(payload),
        );
        setJobFilters({
          companies: [],
          roles: data.role.trim() ? [data.role.trim()] : [],
        });
        setPreferenceError(null);
        setStep("job-preferences");

        setCompanyOptions(await fetchCompanyOptions());
      } catch (err) {
        setPreferenceError(
          err instanceof Error
            ? err.message
            : "Could not load job preferences",
        );
      } finally {
        setIsCompleting(false);
      }
    },
    [resumeData, resumeUrl],
  );

  const handleApplyPreferences = useCallback(async () => {
    if (!pendingProfile) {
      setPreferenceError("Profile information is missing. Go back and save again.");
      return;
    }
    if (jobFilters.roles.length === 0 || jobFilters.companies.length === 0) {
      setPreferenceError("Select at least one role and one company.");
      return;
    }

    setIsCompleting(true);
    setPreferenceError(null);
    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingProfile),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to complete onboarding");
      }

      writeStoredJobProfileFilters(jobFilters);
      window.sessionStorage.removeItem(PENDING_PROFILE_KEY);
      window.sessionStorage.removeItem(PENDING_FILTERS_KEY);
      router.push("/jobs");
    } catch (error) {
      setPreferenceError(
        error instanceof Error ? error.message : "Failed to complete onboarding",
      );
    } finally {
      setIsCompleting(false);
    }
  }, [jobFilters, pendingProfile, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F1FF] font-sans">
      <AppHeader />
      {isParsing ? (
        <ResumeParsingSkeleton
          email={userDefaults.email}
          loadedSections={loadedSections}
          name={userDefaults.name}
          phoneNumber={userDefaults.phoneNumber}
          resumeData={resumeData}
        />
      ) : step === "upload" ? (
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
        <div className="mx-auto w-full max-w-[560px] px-4 pb-14 pt-8 md:pt-10">
          <div className="text-center">
            <h1 className="font-serif text-2xl font-bold text-black">
              Select your job preferences
            </h1>
            <p className="mt-2 text-base text-[#6D6873]">
              Choose the roles and companies you want to practise for.
            </p>
          </div>

          <div className="mt-8 rounded-3xl border border-[#E1DDE5] bg-white p-6 shadow-[0_24px_70px_rgba(58,37,109,0.06)]">
            <JobPreferencesForm
              companyOptions={companyOptions}
              filters={jobFilters}
              isApplying={isCompleting}
              onApply={() => void handleApplyPreferences()}
              roleOptions={jobFilters.roles}
              setFilters={setJobFilters}
            />
            {preferenceError ? (
              <p className="mt-4 text-sm text-destructive" role="alert">
                {preferenceError}
              </p>
            ) : null}
          </div>
        </div>
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

function createEmptyResume(defaults: UserDefaults): ResumeData {
  return {
    name: defaults.name,
    email: defaults.email,
    phoneNumber: defaults.phoneNumber,
    role: "",
    experienceYears: null,
    education: [],
    skills: [],
    experience: [],
    projects: [],
  };
}

function readPendingProfile() {
  try {
    const raw = window.sessionStorage.getItem(PENDING_PROFILE_KEY);
    if (!raw) return null;
    const result = onboardingResumePayloadSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function readPendingFilters() {
  try {
    const raw = window.sessionStorage.getItem(PENDING_FILTERS_KEY);
    return raw ? parseJobProfileFilters(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

async function fetchCompanyOptions() {
  const response = await fetch("/api/jobs/options");
  const payload = (await response.json()) as {
    companies?: { name: string }[];
    error?: string;
  };
  if (!response.ok) {
    throw new Error(
      payload.error ||
        "Could not load suggestions. You can enter a company manually.",
    );
  }
  return (payload.companies ?? []).map((company) => company.name);
}

function waitForPaint() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function waitForFinalSection() {
  return new Promise<void>((resolve) => setTimeout(resolve, 500));
}

function getUserFacingEmail(email: string) {
  const value = email.trim();
  return value.toLowerCase().endsWith("@otp.foreverlearning.in") ? "" : value;
}
