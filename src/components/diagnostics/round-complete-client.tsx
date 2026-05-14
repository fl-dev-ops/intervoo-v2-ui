"use client";

import confetti from "canvas-confetti";
import { CheckIcon, Loader2, MessageCircle, Play } from "lucide-react";
import { IconBrandWhatsapp } from "@tabler/icons-react";
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
  canStartNext: boolean;
  completedRoundTitle: string;
  nextRound: NextRound | null;
};

export function RoundCompleteClient({
  canStartNext,
  completedRoundTitle,
  nextRound,
}: RoundCompleteClientProps) {
  const router = useRouter();
  const isFinalRound = !nextRound;

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (canStartNext || !nextRound) {
      return;
    }

    const intervalId = window.setInterval(() => {
      router.refresh();
    }, 1500);

    return () => window.clearInterval(intervalId);
  }, [canStartNext, nextRound, router]);

  const primaryLabel = nextRound
    ? canStartNext
      ? `Start next Round ${nextRound.roundNumber}`
      : "Finalizing round..."
    : "Go to interview rounds";
  const primaryHref = nextRound
    ? `/diagnostics/prejoin?round=${nextRound.id}`
    : "/diagnostics/rounds";

  return (
    <main className="relative grid min-h-dvh overflow-hidden bg-[#f8f7fb] px-6 py-10 text-foreground">
      <section className="relative z-10 m-auto w-full max-w-sm">
        <div className="overflow-hidden rounded-[1.6rem] border border-black/10 bg-white shadow-[0_18px_60px_rgba(21,18,35,0.08)]">
          <div className="px-8 pb-8 pt-10 text-center">
            <div className="relative mx-auto h-53.5 w-51.5">
              <img
                alt="Round completed"
                className="h-full w-full object-contain"
                src="/round-completed.svg"
              />
              <div className="absolute bottom-6 left-2 grid size-18 place-items-center rounded-full bg-[#58ad6f] text-white shadow-[0_10px_30px_rgba(88,173,111,0.35)]">
                <CheckIcon className="size-9" />
              </div>
            </div>

            <h1 className="mt-3 text-[1.7rem] font-semibold tracking-[-0.04em] text-black">
              {isFinalRound ? "Congratulations!" : "Awesome!"}
            </h1>
            <p className="mt-1 text-sm font-medium text-[#3f3d46]">
              {isFinalRound
                ? "You have completed all 4 rounds"
                : `You have completed ${completedRoundTitle} round!`}
            </p>

            <div className="mt-8 space-y-4">
              {nextRound && !canStartNext ? (
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
                  {nextRound ? (
                    <Play className="mr-2 size-4 fill-current" />
                  ) : null}
                  {primaryLabel}
                </Link>
              )}

              {!isFinalRound && (
                <Link
                  className={cn(
                    buttonVariants({ size: "lg", variant: "outline" }),
                    "h-12 w-full rounded-full border-[#6a4df5] bg-white text-[#5e41cf] hover:bg-[#f6f3ff] hover:text-[#5e41cf]",
                  )}
                  href="/diagnostics/rounds"
                >
                  Go to interview rounds
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 bg-[#fffdf0] px-4 py-4 text-sm font-semibold text-[#25231d]">
            <span>You will get report on whatsapp</span>
            <IconBrandWhatsapp className="size-4 text-[#35b85a]" />
          </div>
        </div>
      </section>
    </main>
  );
}
