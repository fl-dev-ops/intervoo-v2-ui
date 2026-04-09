import type { ReactNode } from "react";

type PrediagnosticsShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  panelClassName?: string;
};

export function PrediagnosticsShell(props: PrediagnosticsShellProps) {
  return (
    <section className="min-h-screen bg-[linear-gradient(180deg,#0B061E_0%,#3C2390_100%)]">
      <div className="hidden min-h-screen md:flex md:justify-center md:px-6 md:pt-12 md:pb-8">
        <div className="w-full max-w-110">
          <PrediagnosticsHeader />

          <div className="relative mt-16">
            <img
              alt=""
              aria-hidden
              className="pointer-events-none absolute -top-30 left-0 z-0 w-[inherit] scale-150"
              src="/glitter.svg"
            />
            <div
              className={`relative z-10 rounded-4xl bg-[#faf9fc] px-8 pt-8 pb-8 shadow-xl ${props.panelClassName ?? ""}`.trim()}
            >
              <PrediagnosticsPanelIntro title={props.title} description={props.description} />
              {props.children}
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-screen flex-col justify-between overflow-hidden md:hidden">
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <PrediagnosticsHeader />
        </div>

        <div className="relative">
          <img
            alt=""
            aria-hidden
            className="pointer-events-none absolute -top-30 left-0 z-0 w-[inherit] scale-150"
            src="/glitter.svg"
          />
          <div
            className={`relative z-10 flex flex-col rounded-t-4xl bg-[#faf9fc] px-6 pt-7 pb-6 text-[#13101b] sm:px-8 sm:pt-8 sm:pb-8 ${props.panelClassName ?? ""}`.trim()}
          >
            <PrediagnosticsPanelIntro title={props.title} description={props.description} mobile />
            {props.children}
          </div>
        </div>
      </div>
    </section>
  );
}

function PrediagnosticsHeader() {
  return (
    <div className="space-y-3 text-center">
      <img alt="Intervoo" className="mx-auto h-10" src="/intervoo-logo-light.svg" />
      <div className="text-2xl font-medium tracking-wider text-white font-figtree">Intervoo.ai</div>
      <p className="mt-6 mb-8 text-[16px] font-medium text-gray-500">
        Speak better. Interview better.
        <br /> With India-trained voice AI.
      </p>
    </div>
  );
}

function PrediagnosticsPanelIntro(props: {
  title: string;
  description?: string;
  mobile?: boolean;
}) {
  return (
    <div className={props.mobile ? "text-center" : "text-center"}>
      <h1 className="text-[1.2rem] font-semibold tracking-[-0.03em] text-[#1b1624] md:text-[1.35rem]">
        {props.title}
      </h1>
      {props.description ? (
        <p className="mt-3 text-sm leading-6 text-[#7f768f] md:text-[0.95rem]">
          {props.description}
        </p>
      ) : null}
    </div>
  );
}
