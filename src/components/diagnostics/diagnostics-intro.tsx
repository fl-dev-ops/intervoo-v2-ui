"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AgentAudioVisualizerAura } from "@/components/agents-ui/agent-audio-visualizer-aura";
import { buttonVariants } from "@/components/ui/button";
import { type CoachOption, coachCards } from "@/lib/coaches";
import { cn } from "@/lib/utils";

const DIAGNOSTIC_INTRO_AUDIO_SRC = "/diag-agent-audio.mp3";
const MESSAGE_DELAYS_MS = [200, 3200, 13_200] as const;
const START_HREF = "/diagnostics/selection";

export function DiagnosticsIntro({
  coach,
  name,
}: {
  coach?: CoachOption | null;
  name?: string | null;
}) {
  const router = useRouter();
  const displayName = name?.trim() || "there";
  const selectedCoach =
    coachCards.find((item) => item.value === coach) ?? coachCards[0];
  const audioRef = useRef<HTMLAudioElement>(null);
  const [orbState, setOrbState] = useState<"idle" | "speaking">("idle");

  useEffect(() => {
    router.prefetch(START_HREF);

    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setOrbState("speaking");
    const handleEnded = () => setOrbState("idle");
    const handlePause = () => setOrbState("idle");

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("pause", handlePause);

    audio.currentTime = 0;
    const timeoutId = window.setTimeout(() => {
      void audio.play().catch(() => {
        // Browsers may block autoplay; the intro remains usable without audio.
      });
    }, MESSAGE_DELAYS_MS[0]);

    return () => {
      window.clearTimeout(timeoutId);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("pause", handlePause);
      audio.pause();
      audio.currentTime = 0;
    };
  }, [router]);

  return (
    <main className="flex min-h-dvh bg-white md:items-center md:bg-[#F5F3F7] md:p-8">
      <audio ref={audioRef} preload="auto">
        <source src={DIAGNOSTIC_INTRO_AUDIO_SRC} type="audio/wav" />
        <track
          default
          kind="captions"
          label="English"
          src="/diag-agent-audio.vtt"
          srcLang="en"
        />
      </audio>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col md:max-w-3xl md:flex-none">
        <h1 className="mb-6 hidden text-center text-2xl font-semibold tracking-tight text-slate-950 md:block">
          Your diagnostic interview is ready
        </h1>

        <section className="flex flex-1 flex-col overflow-hidden bg-[#F5F3F7] shadow-sm md:grid md:flex-none md:grid-cols-2 md:bg-transparent md:shadow-none">
          <div
            className="relative flex min-h-96 overflow-hidden rounded-b-[2rem] px-5 pt-10 md:rounded-l-[2rem] md:rounded-br-none md:px-8 md:pt-12"
            style={{
              background: "linear-gradient(180deg, #0B061E 0%, #3C2390 100%)",
            }}
          >
            <h1 className="relative z-10 mx-auto text-center text-xl font-semibold tracking-tight text-white md:hidden">
              Your diagnostic interview is ready
            </h1>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.24),transparent_58%)]" />
            <div className="absolute inset-0 flex items-center justify-center pt-12 md:pt-0">
              <AgentAudioVisualizerAura
                className="h-[230px] md:h-64"
                color="#a78bfa"
                colorShift={0.6}
                state={orbState}
                themeMode="dark"
              />
            </div>
          </div>

          <div className="flex flex-1 flex-col px-6 pb-6 pt-6 md:rounded-r-[2rem] md:bg-white md:p-8">
            <div className="space-y-4">
              <MessageBubble delayMs={MESSAGE_DELAYS_MS[0]}>
                Hi {displayName}, I&apos;m {selectedCoach.title} your
                interviewer.
              </MessageBubble>
              <MessageBubble delayMs={MESSAGE_DELAYS_MS[1]}>
                Let&apos;s begin your diagnostic interview to assess your
                readiness across Screening, Behavioural, Technical, and Culture
                Fit rounds. Each round will take around 10-15 minutes.
              </MessageBubble>
              <MessageBubble delayMs={MESSAGE_DELAYS_MS[2]}>
                By the end of the interview, you&apos;ll get your hirability
                score and the areas you need to improve.
              </MessageBubble>
            </div>

            <div className="mt-auto pt-8 md:hidden">
              <Link
                className={buttonVariants({
                  className:
                    "h-12 w-full rounded-full! bg-button text-sm font-semibold text-white shadow-lg shadow-[#6548E4]/20 hover:opacity-95",
                })}
                href={START_HREF}
              >
                Start Diagnostic
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-6 hidden justify-center md:flex">
          <Link
            className={buttonVariants({
              className:
                "h-12 min-w-72 rounded-full! bg-button px-10 text-sm font-semibold text-white shadow-lg shadow-[#6548E4]/20 hover:opacity-95",
            })}
            href={START_HREF}
          >
            Start Diagnostic
          </Link>
        </div>
      </div>
    </main>
  );
}

function MessageBubble({
  children,
  delayMs,
  className,
}: {
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
}) {
  return (
    <motion.div
      animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      className={cn(
        "origin-top-left rounded-2xl rounded-tl-none bg-white px-4 py-4 text-base leading-6 text-black shadow-[0_12px_30px_rgba(30,24,60,0.08)]",
        className ?? "",
      )}
      initial={{ opacity: 0, scale: 0.96, x: -10, y: -8 }}
      transition={{ delay: (delayMs ?? 0) / 1000, duration: 0.35 }}
    >
      {children}
    </motion.div>
  );
}
