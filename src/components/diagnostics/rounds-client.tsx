"use client";

import {
  IconCodeAsterisk,
  IconEyeSearch,
  IconUserCheck,
  IconUsersGroup,
} from "@tabler/icons-react";
import { ArrowLeft, CheckIcon, Lock, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { DiagnosticsJobHeader } from "@/components/diagnostics/diagnostics-job-header";
import { DiagnosticsPageHeader } from "@/components/diagnostics/diagnostics-page-header";
import type { DiagnosticJobOption } from "@/lib/diagnostics/job-options";
import {
  DIAGNOSTIC_ROUNDS,
  type DiagnosticRoundConfig,
} from "@/lib/diagnostics/rounds-config";
import {
  getActiveDiagnosticRoundNumber,
  isDiagnosticReportReady,
  isDiagnosticRoundReadyForProgression,
  isDiagnosticRoundReportProcessing,
  isDiagnosticRoundStuckOrFailed,
} from "@/lib/diagnostics/rules";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "../ui/button";

type RoundData = {
  id: string;
  roundType: string;
  roundNumber: number;
  status: string;
  sessionId: string;
  startedAt: string | null;
  reportStatus: string | null;
  reportShareToken: string | null;
  reportScore: number | null;
  reportStartedAt: string | null;
};

function isRoundCompleted(round: RoundData | undefined): boolean {
  return isDiagnosticRoundReadyForProgression(round);
}

function isRoundFailed(round: RoundData | undefined): boolean {
  return isDiagnosticRoundStuckOrFailed(round);
}

export function DiagnosticsRoundsClient({
  initialRounds,
  selectedJob,
  allCompleted,
  hasCompletedRound,
  reportsReadyCount,
  user,
}: {
  initialRounds: RoundData[];
  selectedJob: DiagnosticJobOption;
  allCompleted: boolean;
  hasCompletedRound: boolean;
  reportsReadyCount: number;
  user: { email: string | null; name: string | null };
}) {
  const router = useRouter();

  useEffect(() => {
    const hasPendingReports = initialRounds.some((round) =>
      isDiagnosticRoundReportProcessing(round),
    );

    if (!hasPendingReports) {
      return;
    }

    const intervalId = window.setInterval(() => {
      router.refresh();
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [initialRounds, router]);

  const activeRoundNumber = getActiveDiagnosticRoundNumber(
    initialRounds,
    DIAGNOSTIC_ROUNDS.map((round) => round.id),
  );

  useEffect(() => {
    const activeRound = DIAGNOSTIC_ROUNDS[activeRoundNumber - 1];
    console.info("[diagnostics] rounds client state", {
      activeRoundId: activeRound?.id ?? null,
      activeRoundNumber,
      allCompleted,
      hasCompletedRound,
      reportsReadyCount,
      rounds: initialRounds.map((round) => ({
        reportScore: round.reportScore,
        reportStatus: round.reportStatus,
        roundNumber: round.roundNumber,
        roundType: round.roundType,
        sessionId: round.sessionId,
        status: round.status,
      })),
      selectedJob: selectedJob.title,
    });
  }, [
    activeRoundNumber,
    allCompleted,
    hasCompletedRound,
    initialRounds,
    reportsReadyCount,
    selectedJob.title,
  ]);

  const roundRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const activeEl = roundRefs.current[activeRoundNumber - 1];
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeRoundNumber]);

  return (
    <>
      <main className="min-h-dvh md:pb-10 bg-lavender">
        <header className="bg-transparent">
          {hasCompletedRound ? (
            <DiagnosticsPageHeader
              title={`${selectedJob.title} Interview`}
              user={user}
            />
          ) : (
            <div className="z-100 p-3 md:relative w-full flex flex-row items-center justify-between pb-4 bg-background md:bg-transparent">
              {/* Back button */}
              <button
                className="flex items-center gap-2 text-sm font-medium text-black transition-colors hover:text-foreground"
                onClick={() => router.push("/diagnostics/selection")}
                type="button"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            </div>
          )}
        </header>

        <section className={cn("mx-auto w-full max-w-4xl space-y-6 md:py-8")}>
          {/* Header Card */}
          <DiagnosticsJobHeader bandConfig={selectedJob} />

          {/* Rounds Timeline - Dark Purple Container */}
          <div className="mt-3 rounded-3xl bg-[linear-gradient(180deg,#0B061E_0%,#3C2390_100%)] p-6 md:p-8 rounded-b-none md:rounded-b-3xl">
            <div className="relative mx-auto max-w-4xl">
              <div className="space-y-3">
                {DIAGNOSTIC_ROUNDS.map((roundConfig, index) => {
                  const roundNumber = index + 1;
                  const roundData = initialRounds.find(
                    (round) => round.roundType === roundConfig.id,
                  );
                  const isDone = isRoundCompleted(roundData);
                  const isFailed = isRoundFailed(roundData);
                  const isProcessing =
                    isDiagnosticRoundReportProcessing(roundData);
                  const isStarted =
                    Boolean(roundData) &&
                    roundData?.status === "STARTED" &&
                    !isFailed;
                  const isActive = roundNumber === activeRoundNumber;
                  const isLocked = roundNumber > activeRoundNumber;

                  return (
                    <div
                      key={roundConfig.id}
                      ref={(el) => {
                        roundRefs.current[index] = el;
                      }}
                    >
                      <RoundTimelineItem
                        config={roundConfig}
                        isActive={isActive}
                        isDone={isDone}
                        isFailed={isFailed}
                        isLast={index === DIAGNOSTIC_ROUNDS.length - 1}
                        isLocked={isLocked}
                        isProcessing={isProcessing}
                        isStarted={isStarted}
                        questions={roundConfig.questionsByBand[selectedJob.id]}
                        roundData={roundData}
                        roundNumber={roundNumber}
                        onStart={() => {
                          console.info("[diagnostics] start round clicked", {
                            activeRoundNumber,
                            roundId: roundConfig.id,
                            roundNumber,
                          });
                          router.push(
                            `/diagnostics/prejoin?round=${roundConfig.id}`,
                          );
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Final Report Panel */}
            {allCompleted && (
              <div className="mt-8 text-center">
                {reportsReadyCount === DIAGNOSTIC_ROUNDS.length ? (
                  <a
                    className="inline-flex items-center justify-center rounded-full bg-button px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    href="/diagnostics/final-report"
                  >
                    View Final Diagnostic Report
                  </a>
                ) : (
                  <p className="text-sm leading-6 text-white/60">
                    All rounds are complete. {reportsReadyCount} of{" "}
                    {DIAGNOSTIC_ROUNDS.length} round reports are ready. Generate
                    or wait for the remaining reports to unlock the final
                    diagnostic report.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

function RoundTimelineItem({
  config,
  isActive,
  isDone,
  isFailed,
  isLast,
  isLocked,
  isProcessing,
  isStarted,
  onStart,
  questions,
  roundData,
  roundNumber,
}: {
  config: DiagnosticRoundConfig;
  isActive: boolean;
  isDone: boolean;
  isFailed: boolean;
  isLast: boolean;
  isLocked: boolean;
  isProcessing: boolean;
  isStarted: boolean;
  onStart: () => void;
  questions: string[];
  roundData: RoundData | undefined;
  roundNumber: number;
}) {
  const canStart = (isActive && !isStarted && !isProcessing) || isFailed;
  const isCurrent = canStart || isProcessing || isStarted;

  return (
    <article className="relative grid grid-cols-[3rem_1fr] gap-x-2 md:gap-x-4 gap-y-2 md:gap-y-0">
      <div className="flex items-center justify-center">
        <RoundStateIcon
          config={config}
          isCurrent={isCurrent}
          isDone={isDone}
          isLocked={isLocked}
          isStarted={isStarted}
        />
      </div>

      <div className="flex min-w-0 items-center justify-between gap-3">
        <span
          className={cn(
            "text-xs font-semibold uppercase tracking-[0.12em]",
            isCurrent
              ? "text-purple-400"
              : isDone
                ? "text-emerald-400"
                : isStarted
                  ? "text-amber-400"
                  : "text-white/40",
          )}
        >
          ROUND {roundNumber}
        </span>
        {isDone ? (
          <RoundResultBadge score={roundData?.reportScore ?? null} />
        ) : isProcessing ? (
          <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-white">
            Processing
          </span>
        ) : (
          <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-white">
            {config.duration}
          </span>
        )}
      </div>

      <div className="hidden md:flex justify-center">
        {!isLast && (
          <div
            className={cn(
              "hidden h-full min-h-28 w-1 rounded-full md:block",
              isCurrent
                ? "bg-[linear-gradient(180deg,rgba(108,71,255,0.75)_0%,rgba(0,180,0,0)_100%)]"
                : isDone
                  ? "bg-[linear-gradient(180deg,rgba(61,210,74,0.75)_0%,rgba(0,180,0,0)_100%)]"
                  : "bg-[linear-gradient(180deg,rgba(255,255,255,0.24)_0%,rgba(255,255,255,0)_100%)]",

              // isDone
              //   ? "bg-[linear-gradient(180deg,rgba(61,210,74,0.75)_0%,rgba(0,180,0,0)_100%)]"
              //   : "bg-[linear-gradient(180deg,rgba(255,255,255,0.24)_0%,rgba(255,255,255,0)_100%)]",
            )}
          />
        )}
      </div>

      <div className="min-w-0 pb-6 col-span-2 md:col-span-1">
        <div
          className={cn(
            "rounded-2xl border p-5 transition",
            isCurrent
              ? "border-white/10 bg-white shadow-sm"
              : isStarted
                ? "border-amber-500/20 bg-white/[0.07]"
                : "border-white/10 bg-white/10",
          )}
        >
          <h2
            className={cn(
              "text-lg font-semibold tracking-tight",
              isCurrent ? "text-foreground" : "text-white/80",
            )}
          >
            {config.title}
          </h2>
          <p
            className={cn(
              "mt-2 max-w-3xl text-sm leading-6",
              isCurrent ? "text-muted-foreground" : "text-white/50",
            )}
          >
            {config.description}
          </p>

          {canStart && (
            <div className="grid items-end gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <p className="mt-4 text-sm font-medium text-[#6B6B7A]">
                  Questions may cover
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {questions.map((question) => (
                    <span
                      key={question}
                      className="rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs text-gray-600"
                    >
                      {question}
                    </span>
                  ))}
                </div>
              </div>

              <Button
                className="col-span-2 w-full rounded-full bg-button px-10 py-6 md:col-span-1 md:ml-auto"
                type="button"
                size={"lg"}
                onClick={onStart}
              >
                <Play className="mr-1 size-3 fill-current" />
                Start Round {roundNumber}
              </Button>
            </div>
          )}

          {isProcessing && (
            <div className="mt-4 flex items-center justify-end gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/70">
                <span className="size-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Report processing
              </span>
            </div>
          )}

          {isStarted && (
            <div className="mt-4 flex items-center justify-end gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                Session in progress
              </span>
            </div>
          )}

          {isDone && roundData && (
            <RoundAction isDone={isDone} roundData={roundData} />
          )}
        </div>
      </div>
    </article>
  );
}

function RoundStateIcon({
  config,
  isCurrent,
  isDone,
  isLocked,
  isStarted,
}: {
  config: DiagnosticRoundConfig;
  isCurrent: boolean;
  isDone: boolean;
  isLocked: boolean;
  isStarted: boolean;
}) {
  const Icon = getRoundIcon(config.id);

  return (
    <div
      className={cn(
        "relative z-10 flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full border-2",
        isCurrent
          ? "border-[#6C47FF] bg-[#6C47FF] text-white"
          : isDone
            ? "h-10 w-10 border-emerald-500 bg-[linear-gradient(180deg,#3DD24A_0%,#00B400_100%)] text-white"
            : isLocked
              ? "border-white/20 bg-[#1a0b2e] text-white/40"
              : isStarted
                ? "border-amber-500/50 bg-amber-500/20 text-amber-400"
                : "border-white/20 bg-[#1a0b2e] text-white/40",
      )}
    >
      {isDone ? (
        <CheckIcon className="h-5 w-5" />
      ) : isCurrent ? (
        <Icon className="h-5 w-5" />
      ) : (
        <Lock className="h-4 w-4" />
      )}
    </div>
  );
}

function getRoundIcon(roundId: string) {
  switch (roundId) {
    case "screening":
      return IconUserCheck;
    case "behavioural":
      return IconEyeSearch;
    case "technical-thinking":
      return IconCodeAsterisk;
    case "career-readiness":
      return IconUsersGroup;
    default:
      return IconUserCheck;
  }
}

function RoundResultBadge({ score }: { score: number | null }) {
  const result = getRoundResult(score);

  return (
    <span
      className={cn(
        "rounded-full px-4 py-1 text-sm font-semibold text-white",
        result.className,
      )}
    >
      {result.label}
    </span>
  );
}

function getRoundResult(score: number | null): {
  label: string;
  className: string;
} {
  if (typeof score !== "number") {
    return { label: "Processing", className: "bg-white/15" };
  }

  if (score >= 90) {
    return { label: "Excellent", className: "bg-[#4D8F62]" };
  }

  if (score >= 70) {
    return { label: "Good", className: "bg-[#F49B22]" };
  }

  if (score >= 50) {
    return { label: "Average", className: "bg-[#DE7B48]" };
  }

  return { label: "Poor", className: "bg-[#C7433F]" };
}

function RoundAction({
  isDone,
  roundData,
}: {
  isDone: boolean;
  roundData: RoundData;
}) {
  if (!isDone || !roundData) {
    return null;
  }

  if (
    isDiagnosticReportReady(roundData.reportStatus) &&
    roundData.reportShareToken
  ) {
    return (
      <div className="mt-4 flex justify-end">
        <a
          className={cn(
            buttonVariants({ variant: "link" }),
            "h-auto px-0 py-0 text-[#9C83FF] hover:text-[#B6A5FF]",
          )}
          href={`/d/${roundData.reportShareToken}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          View Report
        </a>
      </div>
    );
  }

  return null;
}
