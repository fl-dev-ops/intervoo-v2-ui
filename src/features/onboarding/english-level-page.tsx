import { useState } from "react";
import { cn } from "#/lib/utils";
import type { EnglishLevel } from "#/pre-screening/setup";

type EnglishLevelPageProps = {
  initialValue: EnglishLevel;
  onBack: () => void;
  onContinue: (value: EnglishLevel) => void;
};

const englishLevels = [
  {
    value: "beginner",
    label: "Beginner",
    description: "I struggle to speak in English. Basic words only.",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "I can hold a basic conversation but make mistakes.",
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "Fluent in most situations, minor gaps.",
  },
  {
    value: "native",
    label: "Native / Near-native",
    description: "Fully comfortable speaking English.",
  },
] as const satisfies Array<{ value: EnglishLevel; label: string; description: string }>;

export function EnglishLevelPage(props: EnglishLevelPageProps) {
  const [value, setValue] = useState<EnglishLevel>(props.initialValue);

  return (
    <section className="rounded-3xl border border-slate-800/90 bg-slate-950/85 p-5 text-slate-100 shadow-[0_28px_60px_rgba(2,6,23,0.55)]">
      <h2 className="text-2xl font-semibold text-slate-50">
        Your <em className="not-italic text-amber-300">English level</em> right now?
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        Pick what feels true today. This only helps us tune the flow.
      </p>

      <div className="mt-5 space-y-2">
        {englishLevels.map((option) => (
          <button
            key={option.value}
            className={cn(
              "flex w-full items-start justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition",
              value === option.value
                ? "border-amber-300/50 bg-amber-400/15"
                : "border-slate-700 bg-slate-900 hover:border-slate-500",
            )}
            type="button"
            onClick={() => setValue(option.value)}
          >
            <div>
              <div className="text-sm font-semibold text-slate-100">{option.label}</div>
              <div className="mt-1 text-xs text-slate-400">{option.description}</div>
            </div>
            <div
              className={cn(
                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
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
