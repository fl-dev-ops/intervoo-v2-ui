import { useState } from "react";
import { cn } from "#/lib/utils";

export type CoachOption = "sara" | "arjun";

type CoachPageProps = {
  initialValue: CoachOption;
  onBack: () => void;
  onContinue: (value: CoachOption) => void;
};

const coachCards = [
  { value: "sara", title: "Sara", description: "Calm, supportive, direct." },
  { value: "arjun", title: "Arjun", description: "Energetic, practical, motivating." },
] as const;

export function CoachPage(props: CoachPageProps) {
  const [value, setValue] = useState<CoachOption>(props.initialValue);

  return (
    <section className="rounded-3xl border border-slate-800/90 bg-slate-950/85 p-5 text-slate-100 shadow-[0_28px_60px_rgba(2,6,23,0.55)]">
      <h2 className="text-2xl font-semibold text-slate-50">
        Pick your <em className="not-italic text-amber-300">voice coach</em>
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        This only affects the presentation for now. Behavior can come later.
      </p>

      <div className="mt-5 space-y-3">
        {coachCards.map((coach) => (
          <button
            key={coach.value}
            className={cn(
              "w-full rounded-2xl border px-4 py-4 text-left transition",
              value === coach.value
                ? "border-amber-300/50 bg-amber-400/10"
                : "border-slate-700 bg-slate-900 hover:border-slate-500",
            )}
            type="button"
            onClick={() => setValue(coach.value)}
          >
            <div className="text-sm font-semibold text-slate-100">{coach.title}</div>
            <div className="mt-1 text-xs text-slate-400">{coach.description}</div>
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
