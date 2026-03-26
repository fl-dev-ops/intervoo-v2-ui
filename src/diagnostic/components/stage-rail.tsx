export function PreScreenStageRail({
  sections,
  activeIndex,
}: {
  sections: Array<{ id: string; label: string; stepCount: number }>;
  activeIndex: number;
}) {
  return (
    <aside className="rounded-[28px] border border-slate-200 bg-white/80 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur lg:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Journey</p>
      <div className="mt-4 space-y-2.5 lg:mt-5 lg:space-y-3">
        {sections.map((section, index) => {
          const isActive = index === activeIndex;
          const isComplete = index < activeIndex;

          return (
            <div
              key={section.id}
              className={`rounded-2xl border px-4 py-3 transition ${
                isActive
                  ? "border-slate-900 bg-slate-950 text-white"
                  : isComplete
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{section.label}</span>
                <span className="text-[11px] opacity-80">{section.stepCount} steps</span>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
