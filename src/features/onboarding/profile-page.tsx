import { useState } from "react";
import { cn } from "#/lib/utils";

export type ProfileFormValue = {
  name: string;
  email: string;
  institution: string;
  degree: string;
  stream: string;
  yearOfStudy: string;
};

const yearOptions = [
  { value: "1", label: "1st" },
  { value: "2", label: "2nd" },
  { value: "3", label: "3rd" },
  { value: "4", label: "4th" },
  { value: "5", label: "5th" },
  { value: "6", label: "Final" },
  { value: "completed", label: "Graduate" },
] as const;

type ProfilePageProps = {
  initialValue: ProfileFormValue;
  onContinue: (value: ProfileFormValue) => void;
};

export function ProfilePage(props: ProfilePageProps) {
  const [value, setValue] = useState(props.initialValue);

  return (
    <section className="rounded-3xl border border-slate-800/90 bg-slate-950/85 p-5 text-slate-100 shadow-[0_28px_60px_rgba(2,6,23,0.55)]">
      <h1 className="text-2xl leading-tight font-semibold text-slate-50">
        Build your <em className="not-italic text-amber-300">profile</em>
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        Add the basic details we need before the assessment flow.
      </p>

      <form
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          props.onContinue(value);
        }}
      >
        <Field label="Full name">
          <input
            className={inputClassName}
            required
            type="text"
            value={value.name}
            onChange={(event) => setValue((current) => ({ ...current, name: event.target.value }))}
          />
        </Field>

        <Field label="Email address">
          <input
            className={inputClassName}
            required
            type="email"
            value={value.email}
            onChange={(event) => setValue((current) => ({ ...current, email: event.target.value }))}
          />
        </Field>

        <Field label="College / institution">
          <input
            className={inputClassName}
            required
            type="text"
            value={value.institution}
            onChange={(event) =>
              setValue((current) => ({ ...current, institution: event.target.value }))
            }
          />
        </Field>

        <Field label="Degree">
          <select
            className={inputClassName}
            required
            value={value.degree}
            onChange={(event) => setValue((current) => ({ ...current, degree: event.target.value }))}
          >
            <option value="">Select degree</option>
            <option value="high_school">High School</option>
            <option value="diploma">Diploma</option>
            <option value="bachelor">Bachelor's</option>
            <option value="master">Master's</option>
            <option value="phd">PhD</option>
            <option value="other">Other</option>
          </select>
        </Field>

        <Field label="Stream / branch">
          <input
            className={inputClassName}
            required
            type="text"
            value={value.stream}
            onChange={(event) => setValue((current) => ({ ...current, stream: event.target.value }))}
          />
        </Field>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            Year of study
          </span>
          <div className="grid grid-cols-4 gap-2">
            {yearOptions.map((option) => (
              <button
                key={option.value}
                className={cn(
                  "h-10 rounded-xl border text-xs font-semibold transition",
                  value.yearOfStudy === option.value
                    ? "border-amber-300/50 bg-amber-400 text-slate-950"
                    : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500",
                )}
                type="button"
                onClick={() =>
                  setValue((current) => ({
                    ...current,
                    yearOfStudy: option.value,
                  }))
                }
              >
                {option.label}
              </button>
            ))}
          </div>
          <input readOnly required className="hidden" tabIndex={-1} value={value.yearOfStudy} />
        </div>

        <button
          className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-amber-300/50 bg-amber-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
          type="submit"
        >
          Next
        </button>
      </form>
    </section>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
        {props.label}
      </span>
      {props.children}
    </label>
  );
}

const inputClassName =
  "h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30";
