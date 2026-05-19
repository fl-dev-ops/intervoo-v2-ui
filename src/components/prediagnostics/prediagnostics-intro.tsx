"use client";

import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { type CoachOption, coachCards } from "@/lib/coaches";
import { cn } from "@/lib/utils";

export function PrediagnosticsIntro({
  coach,
  name,
  retryCode,
}: {
  coach?: CoachOption | null;
  name?: string | null;
  retryCode?: string | null;
}) {
  const displayName = name?.trim() || "there";
  const selectedCoach =
    coachCards.find((item) => item.value === coach) ?? coachCards[0];
  const screeningHref = retryCode
    ? `/prediagnostics/screening?code=${retryCode}`
    : "/prediagnostics/screening";
  const title = retryCode
    ? "Update your pre-screening"
    : "You're all set to begin";
  const ctaLabel = retryCode ? "Retake Pre Screening" : "Start Pre Diagnostic";

  return (
    <main className="flex min-h-dvh bg-white md:items-center md:bg-[#F5F3F7] md:p-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col md:max-w-3xl md:flex-none">
        <h1 className="mb-6 hidden text-center text-2xl font-semibold tracking-tight text-slate-950 md:block">
          {title}
        </h1>

        <section className="flex flex-1 flex-col overflow-hidden bg-[#F5F3F7] shadow-sm md:grid md:flex-none md:grid-cols-2 md:bg-transparent md:shadow-none">
          <div
            className="relative flex min-h-96 overflow-hidden rounded-b-[2rem] px-5 pt-10 md:rounded-l-[2rem] md:rounded-br-none md:px-8 md:pt-12"
            style={{ backgroundColor: selectedCoach.tint }}
          >
            <h1 className="relative z-10 mx-auto text-center text-xl font-semibold tracking-tight text-white md:hidden">
              {title}
            </h1>
            <Image
              priority
              alt={selectedCoach.title}
              className="object-contain object-bottom scale-130 md:scale-148 md:object-center"
              fill
              src={selectedCoach.imageSrc}
            />
          </div>

          <div className="flex flex-1 flex-col px-6 pb-6 pt-6 md:rounded-r-[2rem] md:bg-white md:p-8">
            <div className="space-y-4">
              <MessageBubble delayMs={200}>
                Hi {displayName}, I&apos;m {selectedCoach.title} - your
                interview partner.
              </MessageBubble>
              <MessageBubble delayMs={500}>
                {retryCode
                  ? "Let's update your goals and awareness so your diagnostic interview is more personalized."
                  : "Let's have a quick chat about the jobs you're targeting. I'll use this to create your personalized diagnostic interview."}
              </MessageBubble>
              <MessageBubble delayMs={800}>
                You can speak in your native language. Takes less than 7
                minutes.
              </MessageBubble>
            </div>

            <div className="mt-auto pt-8 md:hidden">
              <Button className="h-12 w-full rounded-full! bg-button text-sm font-semibold text-white shadow-lg shadow-[#6548E4]/20 hover:opacity-95">
                <Link href={screeningHref}>{ctaLabel}</Link>
              </Button>
            </div>
          </div>
        </section>

        <div className="mt-6 hidden justify-center md:flex">
          <Button className="h-12 min-w-72 rounded-full! bg-button px-10 text-sm font-semibold text-white shadow-lg shadow-[#6548E4]/20 hover:opacity-95">
            <Link href={screeningHref}>{ctaLabel}</Link>
          </Button>
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
