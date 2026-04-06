import type { ReactNode } from "react";
import { IconArrowLeft } from "@tabler/icons-react";
import { cn } from "#/lib/utils";

type OnboardingShellProps = {
  step: number;
  totalSteps?: number;
  title: string;
  subtitle?: string;
  sectionTitle?: string;
  onBack?: () => void;
  children: ReactNode;
  footer: ReactNode;
};

export function OnboardingShell(props: OnboardingShellProps) {
  const totalSteps = props.totalSteps ?? 5;

  return (
    <section className="min-h-screen bg-[#F5F3F7]">
      <div className="mx-auto flex min-h-screen w-full flex-col bg-[#F5F3F7] px-6 pt-12 pb-8 text-[#13101b]">
        <div className="relative text-center">
          {props.onBack ? (
            <button
              aria-label="Go back"
              className="absolute top-0 left-0 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f0ebf6] text-[#2c243a]"
              type="button"
              onClick={props.onBack}
            >
              <IconArrowLeft className="h-5 w-5" />
            </button>
          ) : null}

          <h1 className="text-[2rem] leading-[1.1] font-semibold tracking-[-0.04em]">
            {props.title}
          </h1>

          <div className="mt-8 flex justify-center gap-2">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-2 rounded-full transition",
                  index === props.step ? "w-5 bg-[#5a42cc]" : "w-5 bg-[#cdc4dc]",
                )}
              />
            ))}
          </div>

          {props.sectionTitle ? (
            <h2 className="mt-10 text-[1.15rem] font-semibold tracking-[-0.03em]">
              {props.sectionTitle}
            </h2>
          ) : null}

          {props.subtitle ? (
            <p className="mt-3 text-[0.92rem] leading-6 text-[#797186]">{props.subtitle}</p>
          ) : null}
        </div>

        <div className="mt-10 flex-1">{props.children}</div>

        <div className="mt-16">{props.footer}</div>
      </div>
    </section>
  );
}
