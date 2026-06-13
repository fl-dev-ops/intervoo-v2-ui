"use client";

import { IconBrandWhatsapp } from "@tabler/icons-react";
import confetti from "canvas-confetti";
import { AlertCircle, CheckIcon, Loader2, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NextRound = {
  id: string;
  roundNumber: number;
};

type RoundCompleteClientProps = {
  allRoundsComplete: boolean;
  canStartNext: boolean;
  completedRoundId: string;
  completedRoundNumber: number;
  completedRoundTitle: string;
  failureReason: "insufficient_speech" | "generation_failed" | null;
  jobId?: string;
  nextRound: NextRound | null;
  reportErrorMessage: string | null;
  reportStatus: string | null;
};

export function RoundCompleteClient({
  allRoundsComplete,
  canStartNext,
  completedRoundId,
  completedRoundNumber,
  completedRoundTitle,
  failureReason,
  jobId,
  nextRound,
  reportErrorMessage,
  reportStatus,
}: RoundCompleteClientProps) {
  const router = useRouter();
  const hasFailedReport = reportStatus === "FAILED";
  const isFinalRound = allRoundsComplete;
  const primaryLabel = hasFailedReport
    ? `Retake Round ${completedRoundNumber}`
    : !canStartNext
      ? "Generating report..."
      : nextRound
        ? "Go to job rounds"
      : "Go to interview rounds";
  const jobHref = jobId ? `/jobs/${jobId}` : "/jobs";
  const primaryHref = hasFailedReport
    ? jobId
      ? `/jobs/${jobId}/prejoin?round=${completedRoundId}`
      : "/jobs"
    : nextRound
      ? jobHref
      : jobHref;
  const heading = hasFailedReport
    ? failureReason === "insufficient_speech"
      ? "We need a bit more from you"
      : "We could not prepare this report"
    : isFinalRound
      ? "Congratulations!"
      : "Awesome!";
  const description = hasFailedReport
    ? failureReason === "insufficient_speech"
      ? "We could not generate your round report because there were not enough spoken answers. Please retake this round and answer a few questions so we can evaluate you properly."
      : "Something went wrong while generating your round report. Please retake this round."
    : isFinalRound
      ? "You have completed all 4 rounds"
      : `You have completed ${completedRoundTitle} round!`;

  useEffect(() => {
    console.info("[diagnostics] round complete client state", {
      canStartNext,
      allRoundsComplete,
      completedRoundId,
      completedRoundNumber,
      completedRoundTitle,
      failureReason,
      hasFailedReport,
      isFinalRound,
      jobId: jobId ?? null,
      nextRound,
      primaryHref,
      primaryLabel,
      reportErrorMessage,
      reportStatus,
    });
  }, [
    canStartNext,
    allRoundsComplete,
    completedRoundId,
    completedRoundNumber,
    completedRoundTitle,
    failureReason,
    hasFailedReport,
    isFinalRound,
    jobId,
    nextRound,
    primaryHref,
    primaryLabel,
    reportErrorMessage,
    reportStatus,
  ]);

  useEffect(() => {
    if (hasFailedReport) return;

    const end = Date.now() + 3 * 1000;
    const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];
    let animationFrame = 0;

    const frame = () => {
      if (Date.now() > end) return;

      void confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: 0, y: 0.5 },
        colors,
      });
      void confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.5 },
        colors,
      });

      animationFrame = requestAnimationFrame(frame);
    };

    frame();

    return () => cancelAnimationFrame(animationFrame);
  }, [hasFailedReport]);

  useEffect(() => {
    if (hasFailedReport || canStartNext) {
      return;
    }

    const intervalId = window.setInterval(() => {
      router.refresh();
    }, 1500);

    return () => window.clearInterval(intervalId);
  }, [canStartNext, hasFailedReport, router]);

  return (
    <main className="relative grid min-h-dvh overflow-hidden bg-lavender text-foreground page-container">
      <section className="relative z-10 m-auto w-full max-w-md">
        <div className="overflow-hidden rounded-[1.6rem] border border-black/10 bg-white shadow-[0_18px_60px_rgba(21,18,35,0.08)]">
          <div className="px-8 pb-8 pt-10 text-center">
            <div className="relative mx-auto h-52 w-52">
              {hasFailedReport ? (
                <div className="grid h-full w-full place-items-center rounded-full bg-[#fff6e9]">
                  <div className="grid size-24 place-items-center rounded-full bg-[#f39a3d] text-white shadow-[0_10px_30px_rgba(243,154,61,0.3)]">
                    <AlertCircle className="size-12" />
                  </div>
                </div>
              ) : (
                <>
                  <img
                    alt="Round completed"
                    className="h-full w-full object-contain"
                    src="/round-completed.svg"
                  />
                  <div className="absolute bottom-6 left-2 grid size-18 place-items-center rounded-full bg-[#58ad6f] text-white shadow-[0_10px_30px_rgba(88,173,111,0.35)]">
                    <CheckIcon className="size-9" />
                  </div>
                </>
              )}
            </div>

            <h1 className="mt-3 text-[1.7rem] font-semibold tracking-[-0.04em] text-black">
              {heading}
            </h1>
            <p className="mt-1 text-sm font-medium leading-6 text-[#3f3d46]">
              {description}
            </p>

            <div className="mt-8 space-y-4">
              {!canStartNext && !hasFailedReport ? (
                <button
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-12 w-full rounded-full bg-button px-6 text-white",
                  )}
                  disabled
                  type="button"
                >
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {primaryLabel}
                </button>
              ) : (
                <Link
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-12 w-full rounded-full bg-button px-6 text-white hover:opacity-95",
                  )}
                  href={primaryHref}
                >
                  {nextRound || hasFailedReport ? (
                    <Play className="mr-2 size-4 fill-current" />
                  ) : null}
                  {primaryLabel}
                </Link>
              )}

              {(!isFinalRound || hasFailedReport) && (
                <Link
                  className={cn(
                    buttonVariants({ size: "lg", variant: "outline" }),
                    "h-12 w-full rounded-full border-[#6a4df5] bg-white text-[#5e41cf] hover:bg-[#f6f3ff] hover:text-[#5e41cf]",
                  )}
                  href={jobHref}
                >
                  Go to interview rounds
                </Link>
              )}
            </div>
          </div>

          {hasFailedReport ? (
            <div className="bg-[#fffdf0] px-4 py-4 text-center text-sm font-semibold text-[#25231d]">
              Retake this round to generate your report.
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 bg-[#fffdf0] px-4 py-4 text-sm font-semibold text-[#25231d]">
              <span>You will get report on whatsapp</span>
              <IconBrandWhatsapp className="size-4 text-[#35b85a]" />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
