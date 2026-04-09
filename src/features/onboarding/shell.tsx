import type { ReactNode } from "react";
type OnboardingShellProps = {
  title: string;
  subtitle?: string;
  sectionTitle?: string;
  onBack?: () => void;
  children: ReactNode;
  footer: ReactNode;
};

export function OnboardingShell(props: OnboardingShellProps) {
  return (
    <section className="min-h-screen bg-[linear-gradient(180deg,#0B061E_0%,#3C2390_100%)]">
      {/* Desktop: branded header + card */}
      <div className="hidden min-h-screen md:flex md:justify-center md:px-6 md:pt-12 md:pb-8">
        <div className="w-full max-w-120">
          <div className="space-y-3 text-center">
            <img alt="Intervoo" className="mx-auto h-10" src="/intervoo-logo-light.svg" />
            <div className="text-2xl font-medium tracking-wider text-white font-figtree">
              Intervoo.ai
            </div>
            <p className="mt-6 mb-8 text-[16px] font-medium text-gray-500">
              Speak better. Interview better.
              <br /> With India-trained voice AI.
            </p>
          </div>

          <div className="relative mt-16">
            <img
              alt=""
              aria-hidden
              className="pointer-events-none absolute -top-30 left-0 z-0 w-[inherit] scale-150"
              src="/glitter.svg"
            />
            <div className="z-10 relative rounded-4xl bg-[#faf9fc] px-8 pt-8 pb-8 shadow-xl">
              {props.sectionTitle ? (
                <h2 className="mb-5 text-[1.1rem] font-semibold tracking-[-0.03em] text-center text-[#1b1624]">
                  {props.sectionTitle}
                </h2>
              ) : null}

              {props.children}

              <div className="mt-8">{props.footer}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: branded hero + sheet */}
      <div className="flex min-h-screen flex-col justify-between md:hidden">
        <div className="flex flex-col items-center px-6 pt-10 pb-8 text-center">
          <div className="space-y-3">
            <img alt="Intervoo" className="mx-auto h-10" src="/intervoo-logo-light.svg" />
            <div className="text-2xl font-medium tracking-wider text-white font-figtree">
              Intervoo.ai
            </div>
            <p className="my-4 text-[16px] font-medium text-gray-500">
              Speak better. Interview better.
              <br /> With India-trained voice AI.
            </p>
          </div>
        </div>

        <div className="relative">
          <img
            alt=""
            aria-hidden
            className="pointer-events-none absolute -top-30 left-0 z-0 w-[inherit] scale-150"
            src="/glitter.svg"
          />
          <div className="relative z-10 flex flex-col rounded-t-4xl bg-[#faf9fc] px-6 pt-7 pb-6 text-[#13101b] sm:px-8 sm:pt-8 sm:pb-8">
            {props.sectionTitle ? (
              <h2 className="text-center text-[1.08rem] font-semibold tracking-[-0.03em] text-[#1b1624]">
                {props.sectionTitle}
              </h2>
            ) : null}

            <div className="mt-8 flex-1">{props.children}</div>

            <div className="mt-10">{props.footer}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
