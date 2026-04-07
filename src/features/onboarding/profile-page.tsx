import { useState } from "react";
import { IconChevronDown, IconArrowRight } from "@tabler/icons-react";
import { cn } from "#/lib/utils";
import { OnboardingShell } from "./shell";

export type PlacementPreparationOption =
  | "through_college"
  | "self_preparing"
  | "not_preparing"
  | "training_academy";

export type AcademySelectionOption = "DET" | "FSSA" | "Others";

export type ProfileFormValue = {
  name: string;
  email: string;
  preferredName: string;
  institution: string;
  degree: string;
  stream: string;
  yearOfStudy: string;
  placementPreparation: string;
  academySelection: string;
  academyName: string;
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

const placementPreparationOptions = [
  { value: "through_college", label: "Through my college" },
  { value: "self_preparing", label: "Preparing on my own" },
  { value: "not_preparing", label: "I'm not preparing currently" },
  { value: "training_academy", label: "Through a training academy" },
] as const;

const academySelectionOptions = [
  { value: "DET", label: "Deshpande Educational Trust" },
  { value: "FSSA", label: "FSSA" },
  { value: "Others", label: "Others" },
] as const;

type ProfilePageProps = {
  initialValue: ProfileFormValue;
  onContinue: (value: ProfileFormValue) => void;
};

export function ProfilePage(props: ProfilePageProps) {
  const [value, setValue] = useState(props.initialValue);
  const [firstName, ...restName] = value.name.trim().split(/\s+/).filter(Boolean);
  const lastName = restName.join(" ");
  const isTrainingAcademy = value.placementPreparation === "training_academy";
  const isOtherAcademy = value.academySelection === "Others";

  return (
    <OnboardingShell
      footer={
        <div className="flex">
          <button
            className="ml-auto inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(90deg,#4F33A3_0%,#6A4DF5_100%)] px-10 py-4 text-[1.05rem] font-medium tracking-[-0.02em] text-white shadow-[0_14px_28px_rgba(93,72,220,0.25)]"
            form="profile-form"
            type="submit"
          >
            Next
            <IconArrowRight className="h-5 w-5" />
          </button>
        </div>
      }
      step={0}
      title="Build your profile"
    >
      <form
        className="space-y-8"
        id="profile-form"
        onSubmit={(event) => {
          event.preventDefault();
          props.onContinue(value);
        }}
      >
        <Section title="Basic details">
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
              value={value.preferredName}
              onChange={(event) =>
                setValue((current) => ({
                  ...current,
                  preferredName: event.target.value,
                }))
              }
            />
          </Field>

          <Field label="Email address">
            <input
              className={inputClassName}
              required
              type="email"
              value={value.email}
              onChange={(event) =>
                setValue((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
            />
          </Field>
        </Section>

        <Section title="Education">
          <Field label="Highest qualification (Degree / Diploma)">
            <input
              className={inputClassName}
              required
              type="text"
              value={value.degree}
              onChange={(event) =>
                setValue((current) => ({
                  ...current,
                  degree: event.target.value,
                }))
              }
            />
          </Field>

          <Field label="Stream / Branch">
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
          </Field>

          <Field label="College name">
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
        </Section>

        <Section title="Placements preparation">
          <Field label="How are you currently preparing for placements?">
            <SelectField
              required
              value={value.placementPreparation}
              onChange={(event) =>
                setValue((current) => ({
                  ...current,
                  placementPreparation: event.target.value,
                  academySelection:
                    event.target.value === "training_academy" ? current.academySelection : "",
                  academyName: event.target.value === "training_academy" ? current.academyName : "",
                }))
              }
            >
              <option value="">Select how you're preparing</option>
              {placementPreparationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </Field>

          {isTrainingAcademy ? (
            <Field label="Select your academy">
              <SelectField
                required
                value={value.academySelection}
                onChange={(event) =>
                  setValue((current) => ({
                    ...current,
                    academySelection: event.target.value,
                    academyName: event.target.value === "Others" ? current.academyName : "",
                  }))
                }
              >
                <option value="">Select your academy</option>
                {academySelectionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </Field>
          ) : null}

          {isTrainingAcademy && isOtherAcademy ? (
            <Field label="Academy name">
              <input
                className={inputClassName}
                required
                type="text"
                value={value.academyName}
                onChange={(event) =>
                  setValue((current) => ({
                    ...current,
                    academyName: event.target.value,
                  }))
                }
              />
            </Field>
          ) : null}
        </Section>
      </form>
    </OnboardingShell>
  );
}

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <h2 className="shrink-0 text-[1rem] font-semibold uppercase tracking-[-0.02em] text-[#1f1927]">
          {props.title}
        </h2>
        <div className="h-px flex-1 border-t border-dashed border-[#d8d1e3]" />
      </div>
      <div className="space-y-5">{props.children}</div>
    </section>
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

function SelectField(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & {
    children: React.ReactNode;
  },
) {
  return (
    <div className="relative">
      <select {...props} className={cn(selectClassName, props.className)}>
        {props.children}
      </select>
      <IconChevronDown className="pointer-events-none absolute top-1/2 right-5 h-5 w-5 -translate-y-1/2 text-[#1f1927]" />
    </div>
  );
}

const inputClassName =
  "w-full rounded-xl border border-transparent bg-white p-4 py-3 text-[16px] outline-none transition focus:border-[rgba(94,70,221,0.28)] focus:shadow-[0_0_0_4px_rgba(94,70,221,0.10)]";

const selectClassName =
  "w-full appearance-none rounded-xl border border-transparent bg-white p-4 py-3 text-[16px] outline-none transition focus:border-[rgba(94,70,221,0.28)] focus:shadow-[0_0_0_4px_rgba(94,70,221,0.10)]";
