import type { ReactNode } from "react";
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
      {/* Desktop: centered card */}
      <div className="hidden min-h-screen md:flex md:items-center md:justify-center md:px-6 my-10">
        <div className="w-full max-w-140">
          <div className="text-center">
            <img
              alt="Intervoo"
              className="mx-auto h-10 brightness-0"
              src="/intervoo-logo-light.svg"
            />
            <h1 className="mt-4 text-2xl font-medium text-[#13101b] font-figtree tracking-wider">
              {props.title}
            </h1>
            {props.subtitle ? (
              <p className="mt-3 text-[0.92rem] leading-6 text-[#797186]">{props.subtitle}</p>
            ) : null}
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
          </div>

          <div className="relative mt-10">
            <div className="z-10 bg-[#faf9fc] relative rounded-4xl px-8 pt-10 pb-10 shadow-xl">
              {props.sectionTitle ? (
                <h2 className="mb-6 text-[1.15rem] font-semibold tracking-[-0.03em] text-center">
                  {props.sectionTitle}
                </h2>
              ) : null}

              {props.children}

              <div className="mt-10">{props.footer}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: current layout */}
      <div className="mx-auto flex min-h-screen w-full flex-col bg-[#F5F3F7] px-6 pt-12 pb-8 text-[#13101b] md:hidden">
        <div className="relative text-center">
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
