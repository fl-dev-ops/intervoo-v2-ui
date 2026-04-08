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
    <section className="min-h-screen bg-[#F5F3F7]">
      {/* Desktop: two-column layout */}
      <div className="hidden min-h-screen md:flex md:items-center md:justify-center md:px-6">
        <div className="w-full max-w-200 flex gap-2 items-stretch shadow-2xl rounded-xl overflow-hidden">
          <div
            className="flex-1 flex flex-col items-center justify-center p-10 relative"
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
            <div className="w-72 h-72 rounded-full overflow-hidden">
              <img alt={coach.title} className="w-full h-full object-cover" src={coach.imageSrc} />
            </div>
          </div>

          <div className="flex-1 flex flex-col py-10 px-6">
            <h1 className="text-xl leading-tight font-semibold text-center text-[#13101b]">
              You&apos;re all set to begin
            </h1>

            <div className="mt-8 space-y-4">
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
              className="mt-8 w-full"
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

      {/* Mobile: current layout */}
      <div className="mx-auto flex min-h-screen flex-col md:hidden">
        <div className="rounded-b-[48px] shadow-lg" style={{ backgroundColor: coach.heroTint }}>
          <div className="text-center m-4 mb-0 flex flex-row items-center">
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

          <div className="relative mt-2 flex justify-center">
            <img alt={coach.title} className="object-fill" src={coach.imageSrc} />
          </div>
        </div>

        <div className="flex flex-1 flex-col p-6 pt-8">
          <div className="space-y-5">
            <MessageCard>
              Hi {firstName}, I&apos;m {coach.title}, your interview partner.
            </MessageCard>
            <MessageCard delayMs={400}>
              Let&apos;s have a quick chat about the jobs you&apos;re targeting. I&apos;ll use this
              to create your personalized diagnostic interview.
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
            className="mt-auto"
            size={"lg"}
            disabled={props.loading}
            type="button"
            onClick={props.onContinue}
          >
            {props.loading ? "Preparing..." : "Start Pre Diagnostic"}
          </Button>
        </div>
      </div>
    </section>
  );
}

function MessageCard(props: { children: ReactNode; delayMs?: number }) {
  return (
    <div
      className="rounded-tl-sm rounded-4xl bg-white px-6 py-5 shadow-xs opacity-0 animate-[message-card-in_900ms_ease-out_forwards]"
      style={{ animationDelay: `${props.delayMs ?? 0}ms` }}
    >
      {props.children}
    </div>
  );
}
