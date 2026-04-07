import { useState } from "react";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { cn } from "#/lib/utils";
import type { SpeakingSpeed } from "./types";
import { OnboardingShell } from "./shell";

export type CoachOption = "sara" | "arjun";

type CoachPageProps = {
  initialValue: CoachOption;
  initialSpeed: SpeakingSpeed;
  onBack: () => void;
  onContinue: (value: CoachOption, speed: SpeakingSpeed) => void;
};

const coachCards = [
  {
    value: "sara",
    title: "Sara",
    imageSrc: "/sara.png",
  },
  {
    value: "arjun",
    title: "Arjun",
    imageSrc: "/arjun.png",
  },
] as const;

const speedOptions = [
  { value: "normal", label: "Normal", multiplier: "1x" },
  { value: "relaxed", label: "Relaxed", multiplier: ".7x" },
  { value: "slow", label: "Slow", multiplier: ".5x" },
] as const satisfies Array<{
  value: SpeakingSpeed;
  label: string;
  multiplier: string;
}>;

export function CoachPage(props: CoachPageProps) {
  const [value, setValue] = useState<CoachOption>(props.initialValue);
  const [speed, setSpeed] = useState<SpeakingSpeed>(props.initialSpeed);

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
            onClick={() => props.onContinue(value, speed)}
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

        <div>
          <h3 className="text-[1rem] font-semibold text-[#16121f]">Speed</h3>
          <div className="mt-4 space-y-4">
            {speedOptions.map((option) => (
              <button
                key={option.value}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border bg-white p-4 py-3 text-left shadow-[0_12px_28px_rgba(23,18,36,0.04)] transition",
                  speed === option.value ? "border-[#5a42cc]" : "border-[#ddd4e8]",
                )}
                type="button"
                onClick={() => setSpeed(option.value)}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border-2 transition",
                      speed === option.value ? "border-[#5a42cc]" : "border-[#d8d0e1]",
                    )}
                  >
                    <div
                      className={cn(
                        "h-3 w-3 rounded-full transition",
                        speed === option.value ? "bg-[#5a42cc]" : "bg-transparent",
                      )}
                    />
                  </div>
                  <span className="text-[1rem] font-medium text-[#111018]">{option.label}</span>
                </div>

                <span className="flex h-5 min-w-5 items-center justify-center rounded-full px-3 text-[0.95rem] font-medium text-[#66606f]">
                  {option.multiplier}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}
