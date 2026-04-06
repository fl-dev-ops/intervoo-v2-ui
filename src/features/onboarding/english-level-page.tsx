import { useState } from "react";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { cn } from "#/lib/utils";
import type { EnglishLevel } from "#/pre-screening/setup";
import { OnboardingShell } from "./shell";

type EnglishLevelPageProps = {
  initialValue: EnglishLevel;
  onBack: () => void;
  onContinue: (value: EnglishLevel) => void;
};

const englishLevels = [
  {
    value: "native",
    label: "Native / Near-native",
    description: "Fully comfortable speaking English.",
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "Fluent in most situations, minor gaps.",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "I can hold a basic conversation but make mistakes.",
  },
  {
    value: "beginner",
    label: "Beginner",
    description: "I struggle to speak in English. Basic words only.",
  },
] as const satisfies Array<{
  value: EnglishLevel;
  label: string;
  description: string;
}>;

export function EnglishLevelPage(props: EnglishLevelPageProps) {
  const [value, setValue] = useState<EnglishLevel>(props.initialValue);

  return (
    <OnboardingShell
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#ece7f2] px-7 text-[0.98rem] font-medium text-[#2d2639]"
            type="button"
            onClick={props.onBack}
          >
            <IconArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            className="px-10 py-4 ml-auto inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(90deg,#4F33A3_0%,#6A4DF5_100%)] text-[1.05rem] font-medium tracking-[-0.02em] text-white shadow-[0_14px_28px_rgba(93,72,220,0.25)]"
            type="button"
            onClick={() => props.onContinue(value)}
          >
            Next
            <IconArrowRight className="h-5 w-5" />
          </button>
        </div>
      }
      onBack={props.onBack}
      sectionTitle="English fluency"
      step={3}
      subtitle="Pick the option that feels closest to your current comfort level."
      title="Build your profile"
    >
      <div className="space-y-3">
        {englishLevels.map((option) => (
          <button
            key={option.value}
            className={cn(
              "flex w-full items-start gap-4 rounded-xl border bg-white p-4 py-3 text-left transition",
              value === option.value
                ? "border-[#5a42cc] shadow-[0_8px_24px_rgba(90,66,204,0.08)]"
                : "border-transparent",
            )}
            type="button"
            onClick={() => setValue(option.value)}
          >
            <div
              className={cn(
                "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition",
                value === option.value ? "border-[#5a42cc]" : "border-[#d8d0e1]",
              )}
            >
              <div
                className={cn(
                  "h-3 w-3 rounded-full transition",
                  value === option.value ? "bg-[#5a42cc]" : "bg-transparent",
                )}
              />
            </div>
            <div className="flex-1">
              <div className="text-[1rem] leading-[1.35] font-medium text-[#111018]">
                {option.description}
              </div>
              <div className="sr-only">{option.label}</div>
            </div>
          </button>
        ))}
      </div>
    </OnboardingShell>
  );
}
