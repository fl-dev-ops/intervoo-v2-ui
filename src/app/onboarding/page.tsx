"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import {
  ResumeParsingSkeleton,
  ResumeReviewStep,
  ResumeUploadStep,
} from "@/components/onboarding";
import { Spinner } from "@/components/ui/spinner";
import { readNdjsonStream } from "@/lib/ndjson-stream";
import type {
  OnboardingResumeStreamEvent,
  ResumeData,
  ResumeSection,
} from "@/lib/resume-client";

type UserDefaults = {
  name: string;
  email: string;
  phoneNumber: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | undefined>();
  const [loadedSections, setLoadedSections] = useState<ResumeSection[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
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
    const urlStep = step === "review" ? "resume-details" : "resume-upload";
    if (url.searchParams.get("step") === urlStep) return;
    url.searchParams.set("step", urlStep);
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  }, [router, step]);

  const handleParseResume = useCallback(
    async (file: File) => {
      setIsParsing(true);
      setParseError(null);
      setLoadedSections([]);
      setResumeData(createEmptyResume(userDefaults));
      setResumeUrl(undefined);

      try {
        const uploadUrlResponse = await fetch(
          "/api/onboarding/resume-upload-url",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
            }),
          },
        );
        if (!uploadUrlResponse.ok) {
          const error = await uploadUrlResponse.json();
          throw new Error(error.error || "Failed to prepare resume upload");
        }

        const upload = (await uploadUrlResponse.json()) as {
          resumeUrl: string;
          uploadUrl: string;
        };
        const uploadResponse = await fetch(upload.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!uploadResponse.ok) {
          throw new Error("Failed to upload resume");
        }

        const response = await fetch("/api/onboarding/parse-resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeUrl: upload.resumeUrl }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to parse resume");
        }
        if (!response.body) {
          throw new Error("Resume parser returned no response stream");
        }

        let completed = false;

        const processEvent = async (event: OnboardingResumeStreamEvent) => {
          if (event.type === "error") throw new Error(event.error);

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

          completed = true;
          setResumeUrl(event.resumeUrl ?? upload.resumeUrl);
          setResumeData(mergeWithUserDefaults(event.resume, userDefaults));
        };

        for await (const event of readNdjsonStream<OnboardingResumeStreamEvent>(
          response.body,
        )) {
          await processEvent(event);
        }

        if (!completed) throw new Error("Resume parsing did not complete");

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

      try {
        const payload = {
          ...data,
          skillGlosses: resumeData?.skillGlosses ?? {},
          projectKeywords: resumeData?.projectKeywords ?? [],
          projectCapabilities: resumeData?.projectCapabilities ?? [],
          workInitiatives: resumeData?.workInitiatives ?? [],
          resumeUrl,
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

        router.push("/jobs");
      } catch (err) {
        setParseError(
          err instanceof Error ? err.message : "Failed to complete onboarding",
        );
      } finally {
        setIsCompleting(false);
      }
    },
    [resumeData, resumeUrl, router],
  );

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
      ) : (
        resumeData && (
          <ResumeReviewStep
            initialData={resumeData}
            onComplete={handleComplete}
            onBack={() => setStep("upload")}
            isCompleting={isCompleting}
          />
        )
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
