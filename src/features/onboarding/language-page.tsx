import { useState } from "react";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import type { NativeLanguage } from "./types";
import { OnboardingShell } from "./shell";

type LanguagePageProps = {
  initialValue?: NativeLanguage;
  onBack: () => void;
  onContinue: (value: NativeLanguage) => void;
};

const languageOptions = [
  { value: "tamil", label: "Tamil", nativeLabel: "தமிழ்" },
  { value: "hindi", label: "Hindi", nativeLabel: "हिन्दी" },
  { value: "telugu", label: "Telugu", nativeLabel: "తెలుగు" },
  { value: "kannada", label: "Kannada", nativeLabel: "ಕನ್ನಡ" },
  { value: "malayalam", label: "Malayalam", nativeLabel: "മലയാളം" },
  { value: "bengali", label: "Bengali", nativeLabel: "বাংলা" },
] as const satisfies Array<{
  value: NativeLanguage;
  label: string;
  nativeLabel: string;
}>;

export function LanguagePage(props: LanguagePageProps) {
  const [value, setValue] = useState<NativeLanguage | undefined>(props.initialValue);

  return (
    <OnboardingShell
      footer={
        <div className="flex items-center justify-between gap-3">
          <Button size={"lg"} variant="secondary" type="button" onClick={props.onBack}>
            <IconArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            size={"lg"}
            disabled={!value}
            type="button"
            onClick={() => {
              if (value) {
                props.onContinue(value);
              }
            }}
          >
            Next
            <IconArrowRight className="h-5 w-5" />
          </Button>
        </div>
      }
      onBack={props.onBack}
      sectionTitle="Which other language you are comfortable speaking"
      step={1}
      subtitle="We'll use this to personalize the interview experience."
      title="Build your profile"
    >
      <div className="space-y-2.5">
        {languageOptions.map((option) => (
          <button
            key={option.value}
            className={cn(
              "flex w-full items-center justify-between rounded-xl border bg-white p-4 py-3 text-left transition",
              value === option.value
                ? "border-[#5a42cc] shadow-[0_8px_24px_rgba(90,66,204,0.08)]"
                : "border-transparent",
            )}
            type="button"
            onClick={() => setValue(option.value)}
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border-2 transition",
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
              <span className="text-[1rem] font-medium text-[#111018]">{option.label}</span>
            </div>
            <span className="text-[1rem] font-medium text-[#9a98a0]">{option.nativeLabel}</span>
          </button>
        ))}
      </div>
    </OnboardingShell>
  );
}
