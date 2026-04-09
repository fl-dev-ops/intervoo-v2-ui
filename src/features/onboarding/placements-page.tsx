import { useState } from "react";
import { IconArrowLeft, IconArrowRight, IconChevronDown } from "@tabler/icons-react";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import { OnboardingShell } from "./shell";
import type { ProfileFormValue } from "./profile-page";

const placementPreparationOptions = [
  { value: "self_preparing", label: "Preparing on my own" },
  { value: "through_college", label: "Through my college" },
  { value: "training_academy", label: "Through a training academy" },
  { value: "not_preparing", label: "I'm not preparing currently" },
] as const;

const academySelectionOptions = [
  { value: "DET", label: "Deshpande Educational Trust" },
  { value: "FSSA", label: "FSSA" },
  { value: "Others", label: "Others" },
] as const;

type PlacementsPageProps = {
  initialValue: ProfileFormValue;
  onBack: () => void;
  onContinue: (value: ProfileFormValue) => void;
};

export function PlacementsPage(props: PlacementsPageProps) {
  const [value, setValue] = useState(props.initialValue);
  const isTrainingAcademy = value.placementPreparation === "training_academy";
  const isOtherAcademy = value.academySelection === "Others";

  return (
    <OnboardingShell
      footer={
        <div className="flex items-center justify-between gap-3">
          <Button size={"lg"} variant="secondary" type="button" onClick={props.onBack}>
            <IconArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button className="ml-auto" form="placements-form" type="submit" size={"lg"}>
            Next
            <IconArrowRight className="h-5 w-5" />
          </Button>
        </div>
      }
      sectionTitle="Placements preparation"
      step={2}
      title="Build your profile"
    >
      <form
        className="space-y-7"
        id="placements-form"
        onSubmit={(event) => {
          event.preventDefault();
          props.onContinue(value);
        }}
      >
        <div className="space-y-4.5">
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
  "w-full rounded-xl border border-[#ddd5e8] bg-[#f4f0f8] p-4 py-3 text-[16px] text-[#201a2c] outline-none transition focus:border-[rgba(94,70,221,0.28)] focus:bg-white focus:shadow-[0_0_0_4px_rgba(94,70,221,0.10)]";

const selectClassName =
  "w-full appearance-none rounded-xl border border-[#ddd5e8] bg-[#f4f0f8] p-4 py-3 text-[16px] text-[#201a2c] outline-none transition focus:border-[rgba(94,70,221,0.28)] focus:bg-white focus:shadow-[0_0_0_4px_rgba(94,70,221,0.10)]";
