import { useState } from "react";
import { completeOnboarding } from "#/lib/auth.functions";
import { savePreScreeningSetup, type EnglishLevel, type NativeLanguage } from "#/pre-screening/setup";
import { CoachPage, type CoachOption } from "./coach-page";
import { EnglishLevelPage } from "./english-level-page";
import { LanguagePage } from "./language-page";
import { ProfilePage, type ProfileFormValue } from "./profile-page";
import { ReadyPage } from "./ready-page";

type OnboardingStep = "profile" | "coach" | "language" | "english" | "ready";

type OnboardingFlowProps = {
  initialProfile: ProfileFormValue;
};

function isPlaceholderEmail(value: string) {
  return value.endsWith("@otp.foreverlearning.local");
}

function isPlaceholderName(value: string) {
  return value.startsWith("+");
}

export function buildInitialProfile(input: {
  name: string;
  email: string;
  institution?: string | null;
  degree?: string | null;
  stream?: string | null;
  yearOfStudy?: string | null;
}): ProfileFormValue {
  return {
    name: isPlaceholderName(input.name) ? "" : input.name,
    email: isPlaceholderEmail(input.email) ? "" : input.email,
    institution: input.institution ?? "",
    degree: input.degree ?? "",
    stream: input.stream ?? "",
    yearOfStudy: input.yearOfStudy ?? "",
  };
}

export function OnboardingFlow(props: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingStep>("profile");
  const [profile, setProfile] = useState<ProfileFormValue>(props.initialProfile);
  const [coach, setCoach] = useState<CoachOption>("sara");
  const [nativeLanguage, setNativeLanguage] = useState<NativeLanguage>("hindi");
  const [englishLevel, setEnglishLevel] = useState<EnglishLevel>("intermediate");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleComplete() {
    setError("");
    setLoading(true);

    try {
      await completeOnboarding({ data: profile });
      savePreScreeningSetup({
        nativeLanguage,
        englishLevel,
        speakingSpeed: "normal",
      });
      window.location.href = "/assessment";
    } catch {
      setError("Something went wrong while saving your profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_32%),radial-gradient(circle_at_left_bottom,rgba(56,189,248,0.16),transparent_24%),linear-gradient(180deg,#020617,#0f172a)] px-3 font-['Sora',sans-serif] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col gap-4 px-4 py-6 sm:px-0">
        {step === "profile" ? (
          <ProfilePage
            initialValue={profile}
            onContinue={(value) => {
              setProfile(value);
              setStep("coach");
            }}
          />
        ) : null}

        {step === "coach" ? (
          <CoachPage
            initialValue={coach}
            onBack={() => setStep("profile")}
            onContinue={(value) => {
              setCoach(value);
              setStep("language");
            }}
          />
        ) : null}

        {step === "language" ? (
          <LanguagePage
            initialValue={nativeLanguage}
            onBack={() => setStep("coach")}
            onContinue={(value) => {
              setNativeLanguage(value);
              setStep("english");
            }}
          />
        ) : null}

        {step === "english" ? (
          <EnglishLevelPage
            initialValue={englishLevel}
            onBack={() => setStep("language")}
            onContinue={(value) => {
              setEnglishLevel(value);
              setStep("ready");
            }}
          />
        ) : null}

        {step === "ready" ? (
          <ReadyPage
            coach={coach}
            englishLevel={englishLevel}
            error={error}
            loading={loading}
            nativeLanguage={nativeLanguage}
            onBack={() => setStep("english")}
            onContinue={() => {
              void handleComplete();
            }}
          />
        ) : null}
      </div>
    </main>
  );
}
