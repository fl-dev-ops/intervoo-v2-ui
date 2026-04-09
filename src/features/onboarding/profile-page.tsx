import { useState } from "react";
import { IconArrowRight } from "@tabler/icons-react";
import { Button } from "#/components/ui/button";
import { OnboardingShell } from "./shell";

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
          <Button className="ml-auto" form="profile-form" type="submit" size={"lg"}>
            Next
            <IconArrowRight className="h-5 w-5" />
          </Button>
        </div>
      }
      sectionTitle="Basic details"
      step={0}
      title="Build your profile"
    >
      <form
        className="space-y-7"
        id="profile-form"
        onSubmit={(event) => {
          event.preventDefault();
          props.onContinue(value);
        }}
      >
        <div className="space-y-4.5">
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

          <Field label="Email address (optional)">
            <input
              className={inputClassName}
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
