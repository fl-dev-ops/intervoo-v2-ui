import type { CoachOption } from "./coach-page";
import type { EnglishLevel, NativeLanguage } from "#/pre-screening/setup";

type ReadyPageProps = {
  coach: CoachOption;
  nativeLanguage: NativeLanguage;
  englishLevel: EnglishLevel;
  loading: boolean;
  error: string;
  onBack: () => void;
  onContinue: () => void;
};

export function ReadyPage(props: ReadyPageProps) {
  return (
    <section className="rounded-3xl border border-slate-800/90 bg-slate-950/85 p-5 text-slate-100 shadow-[0_28px_60px_rgba(2,6,23,0.55)]">
      <div className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
        You&apos;re ready to begin
      </div>
      <h2 className="mt-3 text-2xl font-semibold text-slate-50">
        Your <em className="not-italic text-amber-300">assessment flow</em> is unlocked
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        We&apos;ve captured the setup for now and will take you to the assessment intro next.
      </p>

      <div className="mt-5 space-y-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Coach</span>
          <span className="font-medium text-slate-100">{props.coach}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Native language</span>
          <span className="font-medium text-slate-100">{props.nativeLanguage}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">English level</span>
          <span className="font-medium text-slate-100">{props.englishLevel}</span>
        </div>
      </div>

      {props.error ? (
        <div className="mt-4 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {props.error}
        </div>
      ) : null}

      <div className="mt-5 flex gap-3">
        <button
          className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
          type="button"
          onClick={props.onBack}
        >
          Back
        </button>
        <button
          className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl border border-amber-300/50 bg-amber-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={props.loading}
          type="button"
          onClick={props.onContinue}
        >
          {props.loading ? "Saving..." : "Start assessment"}
        </button>
      </div>
    </section>
  );
}
