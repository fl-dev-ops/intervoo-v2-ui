import type { PreScreenQuestionnaireDraftDto } from "../dto";

export function PreScreenCompletePanel({
  draft,
  pending,
}: {
  draft: PreScreenQuestionnaireDraftDto;
  pending: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-500">Completed</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Your pre-screen is complete
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Your answers and interview session have been saved. The recording may take a little time
          to finish processing.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Summary
          </p>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <InfoRow label="Student" value={draft.latestAgentContext?.studentName ?? "Unknown"} />
            <InfoRow
              label="Aiming role"
              value={draft.latestAgentContext?.targetRoles.aiming ?? "N/A"}
            />
            <InfoRow
              label="Dream role"
              value={draft.latestAgentContext?.targetRoles.dream ?? "N/A"}
            />
            <InfoRow
              label="Backup role"
              value={draft.latestAgentContext?.targetRoles.backup ?? "N/A"}
            />
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Recording status
          </p>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <InfoRow
              label="Recording"
              value={draft.session?.audioUrl ? "Ready" : "Still processing"}
            />
            <InfoRow
              label="Completed at"
              value={draft.completedAt ? new Date(draft.completedAt).toLocaleString() : "Pending"}
            />
            <InfoRow
              label="Next step"
              value={
                draft.session?.audioUrl
                  ? "Your recording has been saved and is ready for review."
                  : "Please refresh after a short wait to check whether processing is finished."
              }
            />
          </div>

          <div className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
            {pending
              ? "Refreshing..."
              : draft.session?.audioUrl
                ? "Your recording has been saved successfully."
                : "Your recording is still being processed. Check again in a moment."}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 break-all text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}
