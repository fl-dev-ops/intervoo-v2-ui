import { useState } from "react";
import { completeOnboarding } from "#/lib/auth.functions";
import {
  savePreScreeningSetup,
  type EnglishLevel,
  type NativeLanguage,
  type SpeakingSpeed,
} from "./types";
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
  preferredName?: string | null;
  institution?: string | null;
  degree?: string | null;
  stream?: string | null;
  yearOfStudy?: string | null;
  placementPreparation?: string | null;
  academySelection?: string | null;
  academyName?: string | null;
}): ProfileFormValue {
  return {
    name: isPlaceholderName(input.name) ? "" : input.name,
    email: isPlaceholderEmail(input.email) ? "" : input.email,
    preferredName: input.preferredName ?? "",
    institution: input.institution ?? "",
    degree: input.degree ?? "",
    stream: input.stream ?? "",
    yearOfStudy: input.yearOfStudy ?? "",
    placementPreparation: input.placementPreparation ?? "",
    academySelection: input.academySelection ?? "",
    academyName: input.academyName ?? "",
  };
}

export function OnboardingFlow(props: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingStep>("profile");
  const [profile, setProfile] = useState<ProfileFormValue>(props.initialProfile);
  const [coach, setCoach] = useState<CoachOption>("sana");
  const [nativeLanguage, setNativeLanguage] = useState<NativeLanguage | undefined>(undefined);
  const [englishLevel, setEnglishLevel] = useState<EnglishLevel | undefined>(undefined);
  const [speakingSpeed, setSpeakingSpeed] = useState<SpeakingSpeed>("normal");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const firstName = profile.name.trim().split(/\s+/).filter(Boolean)[0] ?? "";

  async function handleComplete() {
    setError("");
    setLoading(true);

    try {
      if (!nativeLanguage || !englishLevel) {
        setError("Please complete all onboarding steps.");
        return;
      }

      await completeOnboarding({
        data: {
          ...profile,
          nativeLanguage: nativeLanguage ?? "",
          englishLevel: englishLevel ?? "",
          speakingSpeed,
          coach,
        },
      });
      savePreScreeningSetup({
        nativeLanguage,
        englishLevel,
        speakingSpeed,
      });
      window.location.href = "/prediagnostics";
    } catch {
      setError("Something went wrong while saving your profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F3F7]">
      <div className="mx-auto flex min-h-screen w-full flex-col justify-start">
        {step === "profile" ? (
          <ProfilePage
            initialValue={profile}
            onContinue={(value) => {
              setProfile(value);
              setStep("language");
            }}
          />
        ) : null}

        {step === "language" ? (
          <LanguagePage
            initialValue={nativeLanguage}
            onBack={() => setStep("profile")}
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
              setStep("coach");
            }}
          />
        ) : null}

        {step === "coach" ? (
          <CoachPage
            initialSpeed={speakingSpeed}
            initialValue={coach}
            onBack={() => setStep("english")}
            onContinue={(value, speed) => {
              setCoach(value);
              setSpeakingSpeed(speed);
              setStep("ready");
            }}
          />
        ) : null}

        {step === "ready" ? (
          <ReadyPage
            coach={coach}
            error={error}
            firstName={firstName}
            loading={loading}
            onBack={() => setStep("coach")}
            onContinue={() => {
              void handleComplete();
            }}
          />
        ) : null}
      </div>
    </main>
  );
}
