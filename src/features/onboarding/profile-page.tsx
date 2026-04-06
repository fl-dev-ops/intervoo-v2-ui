import { useState } from "react";
import { IconChevronDown, IconArrowRight } from "@tabler/icons-react";
import { cn } from "#/lib/utils";
import { OnboardingShell } from "./shell";

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
  const [firstName, ...restName] = value.name.trim().split(/\s+/).filter(Boolean);
  const lastName = restName.join(" ");

  return (
    <OnboardingShell
      footer={
        <div className="flex">
          <button
            className="px-10 py-4 ml-auto inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(90deg,#4F33A3_0%,#6A4DF5_100%)] text-[1.05rem] font-medium tracking-[-0.02em] text-white shadow-[0_14px_28px_rgba(93,72,220,0.25)]"
            form="profile-form"
            type="submit"
          >
            Next
            <IconArrowRight className="h-5 w-5" />
          </button>
        </div>
      }
      sectionTitle="Basic details"
      step={0}
      title="Build your profile"
    >
      <form
        className="space-y-5"
        id="profile-form"
        onSubmit={(event) => {
          event.preventDefault();
          props.onContinue(value);
        }}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="First name">
            <input
              className={inputClassName}
              required
              type="text"
              value={firstName ?? ""}
              onChange={(event) =>
                setValue((current) => ({
                  ...current,
                  name: [event.target.value, lastName].filter(Boolean).join(" "),
                }))
              }
            />
          </Field>
          <Field label="Last name">
            <input
              className={inputClassName}
              type="text"
              value={lastName}
              onChange={(event) =>
                setValue((current) => ({
                  ...current,
                  name: [firstName ?? "", event.target.value].filter(Boolean).join(" "),
                }))
              }
            />
          </Field>
        </div>

        <Field label="How should we call you?">
          <input
            className={inputClassName}
            required
            type="text"
            value={value.email}
            onChange={(event) => setValue((current) => ({ ...current, email: event.target.value }))}
          />
        </Field>

        <Field label="Where are you studying? (College / Institute)">
          <input
            className={inputClassName}
            required
            type="text"
            value={value.institution}
            onChange={(event) =>
              setValue((current) => ({
                ...current,
                institution: event.target.value,
              }))
            }
          />
        </Field>

        <Field label="What are you studying / studied?">
          <div className="relative">
            <select
              className={selectClassName}
              required
              value={value.degree}
              onChange={(event) =>
                setValue((current) => ({
                  ...current,
                  degree: event.target.value,
                }))
              }
            >
              <option value="">Select degree</option>
              <option value="high_school">High School</option>
              <option value="diploma">Diploma</option>
              <option value="bachelor">Bachelor&apos;s</option>
              <option value="master">Master&apos;s</option>
              <option value="phd">PhD</option>
              <option value="other">Other</option>
            </select>
            <IconChevronDown className="pointer-events-none absolute top-1/2 right-5 h-5 w-5 -translate-y-1/2 text-[#1f1927]" />
          </div>
        </Field>

        <Field label="Which stream / branch?">
          <div className="relative">
            <input
              className={inputClassName}
              required
              type="text"
              value={value.stream}
              onChange={(event) =>
                setValue((current) => ({
                  ...current,
                  stream: event.target.value,
                }))
              }
            />
          </div>
        </Field>

        <div className="flex flex-col gap-3">
          <span className="text-[14px] font-medium text-[#6e667b]">Which year are you in?</span>
          <div className="grid grid-cols-4 gap-2">
            {yearOptions.map((option) => (
              <button
                key={option.value}
                className={cn(
                  "h-11 rounded-xl text-[13px] font-medium transition",
                  value.yearOfStudy === option.value
                    ? "bg-[#5a42cc] text-white"
                    : "bg-white text-[#3b3347]",
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
          <input
            readOnly
            required
            className="hidden rounded-xl"
            tabIndex={-1}
            value={value.yearOfStudy}
          />
        </div>
      </form>
    </OnboardingShell>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[14px] font-medium text-[#6e667b]">{props.label}</span>
      {props.children}
    </label>
  );
}

const inputClassName =
  "p-4 py-3 w-full rounded-xl border border-transparent bg-white text-[16px] outline-none transition focus:border-[rgba(94,70,221,0.28)] focus:shadow-[0_0_0_4px_rgba(94,70,221,0.10)]";

const selectClassName =
  "p-4 py-3 w-full rounded-xl border border-transparent bg-white text-[16px] outline-none transition focus:border-[rgba(94,70,221,0.28)] focus:shadow-[0_0_0_4px_rgba(94,70,221,0.10)] appearance-none";
