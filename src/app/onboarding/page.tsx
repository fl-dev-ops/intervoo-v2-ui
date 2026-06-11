"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import {
  ResumeUploadStep,
  ResumeReviewStep,
} from "@/components/onboarding";
import { authClient } from "@/lib/auth-client";
import { LogOut } from "lucide-react";

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
};

type UserDefaults = {
  name: string;
  email: string;
  phoneNumber: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"upload" | "review">("upload");
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
      setResumeData(mergeWithUserDefaults(data.resume, userDefaults));
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

  const handleComplete = useCallback(
    async (data: ResumeData) => {
      setIsCompleting(true);

      try {
        const response = await fetch("/api/onboarding/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
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
    [router],
  );

  const handleLogout = useCallback(async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push("/login"),
      },
    });
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F1FF] font-sans">
      <header className="border-b border-[#F1EEF6] bg-white">
        <div className="mx-auto flex h-16 w-full max-w-[1080px] items-center justify-between px-6 md:h-[72px]">
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
              <p className="text-lg font-extrabold tracking-tight text-black">
                Intervoo.ai
              </p>
              <p className="mt-1 text-xs text-black/80">
                by Foreverlearning.in
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex size-10 items-center justify-center rounded-full text-[#565656] transition hover:bg-[#F4F1FA] hover:text-black"
            aria-label="Logout"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </header>
      {step === "upload" ? (
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
    name: "",
    email: "",
    phoneNumber: resume.phoneNumber || defaults.phoneNumber,
  };
}
