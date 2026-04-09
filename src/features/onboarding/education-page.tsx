import { useState } from "react";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { Button } from "#/components/ui/button";
import { OnboardingShell } from "./shell";
import type { ProfileFormValue } from "./profile-page";

type EducationPageProps = {
  initialValue: ProfileFormValue;
  onBack: () => void;
  onContinue: (value: ProfileFormValue) => void;
};

export function EducationPage(props: EducationPageProps) {
  const [value, setValue] = useState(props.initialValue);

  return (
    <OnboardingShell
      footer={
        <div className="flex items-center justify-between gap-3">
          <Button size={"lg"} variant="secondary" type="button" onClick={props.onBack}>
            <IconArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button className="ml-auto" form="education-form" type="submit" size={"lg"}>
            Next
            <IconArrowRight className="h-5 w-5" />
          </Button>
        </div>
      }
      sectionTitle="Education"
      step={1}
      title="Build your profile"
    >
      <form
        className="space-y-7"
        id="education-form"
        onSubmit={(event) => {
          event.preventDefault();
          props.onContinue(value);
        }}
      >
        <div className="space-y-4.5">
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
        </div>
      </form>
    </OnboardingShell>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[14px] font-medium text-[#6e667b]">{props.label}</span>
      {props.children}
    </label>
  );
}

const inputClassName =
  "w-full rounded-xl border border-[#ddd5e8] bg-[#f4f0f8] p-4 py-3 text-[16px] text-[#201a2c] outline-none transition focus:border-[rgba(94,70,221,0.28)] focus:bg-white focus:shadow-[0_0_0_4px_rgba(94,70,221,0.10)]";
