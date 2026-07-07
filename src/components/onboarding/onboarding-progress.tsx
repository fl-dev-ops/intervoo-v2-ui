"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  FileUp,
  UserRoundPen,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type OnboardingStep =
  "resume-upload" | "resume-details" | "job-preferences";

const STEPS = [
  {
    id: "resume-upload",
    label: "Upload resume",
    icon: FileUp,
    iconClassName: "text-amber-500",
  },
  {
    id: "resume-details",
    label: "Profile update",
    icon: UserRoundPen,
    iconClassName: "text-violet-500",
  },
  {
    id: "job-preferences",
    label: "Select Job Role",
    icon: BriefcaseBusiness,
    iconClassName: "text-emerald-600",
  },
] satisfies {
  id: OnboardingStep;
  label: string;
  icon: typeof FileUp;
  iconClassName: string;
}[];

interface OnboardingProgressProps {
  activeStep: OnboardingStep;
  availableSteps: OnboardingStep[];
  completedSteps: OnboardingStep[];
  onStepChange: (step: OnboardingStep) => void;
}

export function OnboardingProgress({
  activeStep,
  availableSteps,
  completedSteps,
  onStepChange,
}: OnboardingProgressProps) {
  return (
    <nav
      aria-label="Onboarding progress"
      className="mx-auto w-full max-w-[680px] px-4 pt-7 md:pt-9"
    >
      <ol className="grid w-full grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === activeStep;
          const isAvailable = availableSteps.includes(step.id);
          const isCompleted = !isActive && completedSteps.includes(step.id);

          return (
            <li className="contents" key={step.id}>
              <button
                type="button"
                aria-current={isActive ? "step" : undefined}
                disabled={!isAvailable}
                onClick={() => {
                  if (!isActive) onStepChange(step.id);
                }}
                className={cn(
                  "inline-flex h-24 min-w-0 flex-col items-center justify-center gap-3 rounded-2xl border bg-white px-2 text-sm font-medium text-black shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6846E8] focus-visible:ring-offset-2 md:h-12 md:flex-row md:gap-2 md:rounded-full md:px-4 md:text-sm",
                  isActive
                    ? "border-[#6846E8] font-semibold shadow-[0_6px_16px_rgba(104,70,232,0.12)]"
                    : "border-[#DED7E9]",
                  isAvailable && !isActive && "hover:border-[#9C88E9]",
                  (!isAvailable || isActive) && "cursor-default",
                )}
              >
                {isCompleted ? (
                  <span className="flex size-4 items-center justify-center rounded-full bg-black text-white">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                ) : (
                  <Icon
                    className={cn("size-5 md:size-4", step.iconClassName)}
                  />
                )}
                <span className="text-center leading-tight">{step.label}</span>
              </button>

              {index < STEPS.length - 1 ? (
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 text-[#B5ADBF]"
                  strokeWidth={1.5}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function isOnboardingStep(
  value: string | null,
): value is OnboardingStep {
  return STEPS.some((step) => step.id === value);
}
