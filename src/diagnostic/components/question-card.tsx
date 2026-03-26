import type { PreScreenQuestionConfig } from "../question-types";

export function PreScreenQuestionCard({
  question,
  value,
  pending,
  onChange,
}: {
  question: PreScreenQuestionConfig;
  value: string;
  pending: boolean;
  onChange: (value: string) => void;
}) {
  const sharedClassName =
    "w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70 md:px-5 md:py-4";

  return (
    <div className="flex h-full flex-col gap-5 md:gap-6">
      <div>
        <p className="text-sm font-medium text-slate-500">{question.title}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
          {question.prompt}
        </h2>
        {question.helpText ? (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{question.helpText}</p>
        ) : null}
      </div>

      <div className="space-y-3">
        {question.inputType === "textarea" ? (
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={question.placeholder}
            disabled={pending}
            rows={5}
            className={`${sharedClassName} min-h-[144px] resize-none md:min-h-[168px]`}
          />
        ) : (
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={question.placeholder}
            disabled={pending}
            className={`${sharedClassName} min-h-[56px] md:min-h-[60px]`}
          />
        )}

        <p className="text-xs leading-5 text-slate-500">
          This answer is saved and used to personalize your pre-screen practice.
        </p>
      </div>
    </div>
  );
}
