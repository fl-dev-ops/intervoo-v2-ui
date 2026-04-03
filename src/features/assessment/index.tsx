export function AssessmentPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_32%),radial-gradient(circle_at_left_bottom,rgba(56,189,248,0.16),transparent_24%),linear-gradient(180deg,#020617,#0f172a)] px-3 font-['Sora',sans-serif] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col gap-4 px-4 py-6 sm:px-0">
        <section className="rounded-3xl border border-slate-800/90 bg-slate-950/85 p-5 shadow-[0_28px_60px_rgba(2,6,23,0.55)]">
          <div className="inline-flex rounded-full border border-amber-300/40 bg-amber-400/12 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-amber-200">
            Assessment Ready
          </div>
          <h1 className="mt-4 text-[2rem] leading-tight font-semibold text-slate-50">
            Start your <em className="not-italic text-amber-300">pre-diagnostic</em>
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            You&apos;ll have a short voice conversation and then we&apos;ll generate your
            assessment report.
          </p>

          <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-900/65 p-4 text-sm text-slate-200">
            <div>🎙 Voice-first conversation with Sana</div>
            <div className="mt-3">📋 Job goal and awareness assessment</div>
            <div className="mt-3">⚡ Report generated right after the session</div>
          </div>

          <a
            className="mt-5 inline-flex h-14 w-full items-center justify-center rounded-full border border-amber-300/50 bg-amber-400 px-5 text-lg font-semibold text-slate-950 transition hover:bg-amber-300"
            href="/assessment/session"
          >
            Start assessment
          </a>
        </section>
      </div>
    </main>
  );
}
