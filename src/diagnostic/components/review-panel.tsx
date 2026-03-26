import { PRE_SCREEN_FLOW_SECTIONS } from "../flow";
import { getPreScreenQuestionConfig } from "../config";
import type { PreScreenQuestionId, PreScreenStepId } from "../question-types";
import type { PreScreenQuestionnaireDraftDto } from "../dto";

export function PreScreenReviewPanel({
  draft,
  onEdit,
}: {
  draft: PreScreenQuestionnaireDraftDto;
  onEdit: (step: PreScreenStepId) => Promise<void>;
}) {
  const grouped = PRE_SCREEN_FLOW_SECTIONS.slice(0, 3).map((section) => ({
    id: section.id,
    label: section.label,
    items: section.stepIds.map((stepId) => {
      const questionId = stepId as PreScreenQuestionId;
      const config = getPreScreenQuestionConfig(questionId);
      const value = getAnswerAsInputValue(draft.answers[questionId]);

      return {
        stepId,
        label: config?.prompt ?? questionId,
        value,
      };
    }),
  }));

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-slate-500">Review</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Check your answers before the pre-screen
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Make sure everything looks right. You can update any answer before moving on.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid gap-4 xl:grid-cols-3">
          {grouped.map((section) => (
            <div
              key={section.id}
              className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
            >
              <p className="text-sm font-semibold text-slate-950">{section.label}</p>
              <div className="mt-4 space-y-4">
                {section.items.map((item) => (
                  <div key={item.stepId} className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {item.value || "No answer saved yet."}
                    </p>
                    <button
                      type="button"
                      onClick={() => void onEdit(item.stepId)}
                      className="mt-3 rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getAnswerAsInputValue(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value, null, 2);
  return "";
}
