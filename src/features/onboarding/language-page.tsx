import { useState } from "react";
import { cn } from "#/lib/utils";
import type { NativeLanguage } from "#/pre-screening/setup";

type LanguagePageProps = {
  initialValue: NativeLanguage;
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
] as const satisfies Array<{ value: NativeLanguage; label: string; nativeLabel: string }>;

export function LanguagePage(props: LanguagePageProps) {
  const [value, setValue] = useState<NativeLanguage>(props.initialValue);

  return (
    <section className="rounded-3xl border border-slate-800/90 bg-slate-950/85 p-5 text-slate-100 shadow-[0_28px_60px_rgba(2,6,23,0.55)]">
      <h2 className="text-2xl font-semibold text-slate-50">
        What&apos;s your <em className="not-italic text-amber-300">native language?</em>
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        We&apos;ll use this to personalize the experience during the assessment.
      </p>

      <div className="mt-5 space-y-2">
        {languageOptions.map((option) => (
          <button
            key={option.value}
            className={cn(
              "flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition",
              value === option.value
                ? "border-amber-300/50 bg-amber-400/15"
                : "border-slate-700 bg-slate-900 hover:border-slate-500",
            )}
            type="button"
            onClick={() => setValue(option.value)}
          >
            <div className="text-sm font-semibold text-slate-100">
              {option.label} <span className="text-slate-400">{option.nativeLabel}</span>
            </div>
            <div
              className={cn(
                "flex size-6 items-center justify-center rounded-full border text-xs font-semibold",
                value === option.value
                  ? "border-amber-300 bg-amber-400 text-slate-950"
                  : "border-slate-600 text-transparent",
              )}
            >
              ✓
            </div>
          </button>
        ))}
      </div>

      <div className="mt-5 flex gap-3">
        <button
          className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
          type="button"
          onClick={props.onBack}
        >
          Back
        </button>
        <button
          className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl border border-amber-300/50 bg-amber-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
          type="button"
          onClick={() => props.onContinue(value)}
        >
          Next
        </button>
      </div>
    </section>
  );
}
