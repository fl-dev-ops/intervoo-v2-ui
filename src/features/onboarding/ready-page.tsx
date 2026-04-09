import type { ReactNode } from "react";
import { IconArrowLeft } from "@tabler/icons-react";
import { Button } from "#/components/ui/button";
import type { CoachOption } from "./coach-page";
import { LoaderCircle } from "lucide-react";

type ReadyPageProps = {
  coach: CoachOption;
  firstName: string;
  loading: boolean;
  error: string;
  onBack: () => void;
  onContinue: () => void;
};

const coachMeta: Record<CoachOption, { title: string; imageSrc: string; heroTint: string }> = {
  sana: {
    title: "Sana",
    imageSrc: "/sara.png",
    heroTint: "#b8b25b",
  },
  arjun: {
    title: "Arjun",
    imageSrc: "/arjun.png",
    heroTint: "#8ea5c4",
  },
};

export function ReadyPage(props: ReadyPageProps) {
  const coach = coachMeta[props.coach];
  const firstName = props.firstName.trim() || "there";

  return (
    <section className="min-h-screen bg-[linear-gradient(180deg,#0B061E_0%,#3C2390_100%)]">
      {/* Desktop: two-column layout */}
      <div className="hidden min-h-screen md:flex md:justify-center md:px-6 md:pt-12 md:pb-8">
        <div className="w-full max-w-170">
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
            <div className="relative z-10 flex w-full gap-3 items-stretch overflow-hidden rounded-[28px] bg-[#f1ecf7] shadow-2xl">
              <div
                className="relative flex flex-1 flex-col items-center justify-center p-8 lg:p-10"
                style={{ backgroundColor: coach.heroTint }}
              >
                <Button
                  aria-label="Go back"
                  className="absolute top-6 left-6 h-10 w-10 bg-white/20 text-white hover:bg-white/25"
                  size="icon"
                  variant="ghost"
                  type="button"
                  onClick={props.onBack}
                >
                  <IconArrowLeft className="h-5 w-5" />
                </Button>
                <div className="h-64 w-64 overflow-hidden rounded-full lg:h-72 lg:w-72">
                  <img
                    alt={coach.title}
                    className="w-full h-full object-cover"
                    src={coach.imageSrc}
                  />
                </div>
              </div>

              <div className="flex flex-1 flex-col px-6 py-8 lg:px-7 lg:py-9">
                <h1 className="text-xl leading-tight font-semibold text-center text-[#13101b]">
                  You&apos;re all set to begin
                </h1>

                <div className="mt-6 space-y-4">
                  <MessageCard>
                    Hi {firstName}, I&apos;m {coach.title}, your interview partner.
                  </MessageCard>
                  <MessageCard delayMs={400}>
                    Let&apos;s have a quick chat about the jobs you&apos;re targeting. I&apos;ll use
                    this to create your personalized diagnostic interview.
                  </MessageCard>
                  {/*<MessageCard delayMs={800}>
                You can speak in your native language. Takes less than 7
                minutes.
              </MessageCard>*/}
                </div>

                <Button
                  className="mt-6 w-full"
                  disabled={props.loading}
                  type="button"
                  onClick={props.onContinue}
                >
                  {props.loading ? (
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                  ) : (
                    "Start Pre Diagnostic"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: current layout */}
      <div className="mx-auto flex min-h-screen flex-col md:hidden">
        <div className="flex flex-col items-center px-6 pt-10 pb-6 text-center">
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

        <div className="relative mt-2 w-screen overflow-x-hidden">
          <img
            alt=""
            aria-hidden
            className="pointer-events-none absolute -top-30 left-0 z-0 w-[inherit] scale-150"
            src="/glitter.svg"
          />
          <div className="relative z-10 overflow-hidden rounded-t-4xl bg-[#f1ecf7] shadow-lg">
            <div style={{ backgroundColor: coach.heroTint }}>
              <div className="p-4 pb-0 flex flex-row items-center text-center">
                <div className="flex-1">
                  <Button
                    aria-label="Go back"
                    className="h-10 w-10 bg-[rgba(102,98,42,0.28)] text-white hover:bg-[rgba(102,98,42,0.36)]"
                    size="icon"
                    variant="ghost"
                    type="button"
                    onClick={props.onBack}
                  >
                    <IconArrowLeft className="h-4 w-4" />
                  </Button>
                </div>
                <h1 className="flex-6 mx-auto text-2xl leading-[1.06] font-medium text-white">
                  You&apos;re all set to begin
                </h1>
                <div className="flex-1"></div>
              </div>

              <div className="relative mt-1 flex justify-center px-5">
                <img alt={coach.title} className="object-fill" src={coach.imageSrc} />
              </div>
            </div>

            <div className="flex flex-col px-5 pt-6 pb-4 sm:px-6">
              <div className="space-y-4">
                <MessageCard>
                  Hi {firstName}, I&apos;m {coach.title}, your interview partner.
                </MessageCard>
                <MessageCard delayMs={400}>
                  Let&apos;s have a quick chat about the jobs you&apos;re targeting. I&apos;ll use
                  this to create your personalized diagnostic interview.
                </MessageCard>
                {/*<MessageCard delayMs={800}>
               You can speak in your native language. Takes less than 7 minutes.
             </MessageCard>*/}
              </div>

              {/*{props.error ? (
            <div className="mt-5 rounded-xl border border-[rgba(225,93,93,0.14)] bg-[rgba(225,93,93,0.08)] px-4 py-3 text-[0.9rem] text-[#c45252]">
              {props.error}
            </div>
          ) : null}*/}

              <Button
                className="mt-10"
                size={"lg"}
                disabled={props.loading}
                type="button"
                onClick={props.onContinue}
              >
                {props.loading ? "Preparing..." : "Start Pre Diagnostic"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MessageCard(props: { children: ReactNode; delayMs?: number }) {
  return (
    <div
      className="rounded-tl-sm rounded-4xl border border-[#e2d9ef] bg-white px-5 py-4.5 shadow-[0_10px_24px_rgba(58,39,128,0.06)] opacity-0 animate-[message-card-in_900ms_ease-out_forwards] sm:px-6 sm:py-5"
      style={{ animationDelay: `${props.delayMs ?? 0}ms` }}
    >
      {props.children}
    </div>
  );
}
