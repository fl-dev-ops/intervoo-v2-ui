import type { PreScreenQuestionnaireDraftDto } from "../dto";

export function PreScreenPermissionsPanel({
  draft,
  pending,
}: {
  draft: PreScreenQuestionnaireDraftDto;
  pending: boolean;
}) {
  const context = draft.latestAgentContext;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-500">Get ready</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Ready to start your pre-screen
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          When you continue, we will prepare your pre-screen session and begin recording so your
          responses can be reviewed later.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Your interview summary
          </p>
          <div className="mt-4 space-y-4 text-sm leading-6 text-slate-700">
            <div>
              <p className="font-semibold text-slate-900">Student</p>
              <p>{context?.studentName ?? "Unknown"}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Target roles</p>
              <p>
                Aiming: {context?.targetRoles.aiming ?? "N/A"}
                <br />
                Dream: {context?.targetRoles.dream ?? "N/A"}
                <br />
                Backup: {context?.targetRoles.backup ?? "N/A"}
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Profile summary</p>
              <p>{context?.profileSummary ?? "No derived summary yet."}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Before you begin
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
            <li>Check that your microphone is working before you continue.</li>
            <li>Find a quiet place where you can speak clearly and without interruptions.</li>
            <li>Keep water, notes, or your resume nearby if you need them.</li>
            <li>If anything goes wrong, you can restart and try again.</li>
          </ul>

          <div className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
            {pending
              ? "Preparing your pre-screen and starting the recording..."
              : "Press continue when you are ready to begin."}
          </div>
        </div>
      </div>
    </div>
  );
}
