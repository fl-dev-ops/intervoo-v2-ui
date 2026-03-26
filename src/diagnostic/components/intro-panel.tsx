export function PreScreenIntroPanel({
  onStart,
  pending,
}: {
  onStart: () => void;
  pending: boolean;
}) {
  return (
    <div className="flex h-full flex-col justify-between gap-8">
      <div>
        <p className="text-sm font-medium text-slate-500">Welcome</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Start your pre-screen practice
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          You will answer a focused set of questions about your background, interests, and career
          goals first. Those answers will be used to tailor the practice interview experience to
          you.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          "One question at a time",
          "Pause and continue later",
          "Your interview recording is saved for review",
        ].map((item) => (
          <div key={item} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="h-10 w-10 rounded-2xl bg-slate-200" />
            <p className="mt-4 text-sm font-semibold text-slate-900">{item}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onStart}
          disabled={pending}
          className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Starting..." : "Start questions"}
        </button>
      </div>
    </div>
  );
}
