import { useState } from "react";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { cn } from "#/lib/utils";
import { OnboardingShell } from "./shell";

export type CoachOption = "sana" | "arjun";

type CoachPageProps = {
  initialValue: CoachOption;
  onBack: () => void;
  onContinue: (value: CoachOption) => void;
};

const coachCards = [
  {
    value: "sana",
    title: "Sana",
    imageSrc: "/sara.png",
  },
  {
    value: "arjun",
    title: "Arjun",
    imageSrc: "/arjun.png",
  },
] as const;

export function CoachPage(props: CoachPageProps) {
  const [value, setValue] = useState<CoachOption>(props.initialValue);

  return (
    <OnboardingShell
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#ece7f2] px-7 text-[0.98rem] font-medium text-[#2d2639]"
            type="button"
            onClick={props.onBack}
          >
            <IconArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            className="px-10 py-4 ml-auto inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(90deg,#4F33A3_0%,#6A4DF5_100%)] text-[1.05rem] font-medium tracking-[-0.02em] text-white shadow-[0_14px_28px_rgba(93,72,220,0.25)]"
            type="button"
            onClick={() => props.onContinue(value)}
          >
            Next
            <IconArrowRight className="h-5 w-5" />
          </button>
        </div>
      }
      onBack={props.onBack}
      sectionTitle="Choose your coach"
      step={4}
      // subtitle="This just changes the style of guidance for now."
      title="Build your profile"
    >
      <div className="space-y-7">
        <div className="grid grid-cols-2 gap-4">
          {coachCards.map((coach) => (
            <button
              key={coach.value}
              className={cn(
                "overflow-hidden rounded-3xl border bg-white text-left shadow-[0_12px_28px_rgba(23,18,36,0.08)] transition",
                value === coach.value ? "border-[#5a42cc] border-2" : "border-transparent",
              )}
              type="button"
              onClick={() => setValue(coach.value)}
            >
              <div className="aspect-[0.88] overflow-hidden bg-[#9885a5]">
                <img
                  alt={coach.title}
                  className="h-full w-full object-cover"
                  src={coach.imageSrc}
                />
              </div>
              <div className="flex flex-col items-center gap-3 p-4 py-3">
                <div className="text-[1.05rem] font-medium text-[#1b1624]">{coach.title}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </OnboardingShell>
  );
}
