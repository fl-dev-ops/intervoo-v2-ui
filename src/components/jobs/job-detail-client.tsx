"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckIcon, LoaderCircle, Play } from "lucide-react";
import {
  IconCodeAsterisk,
  IconEyeSearch,
  IconUserCheck,
  IconUsersGroup,
} from "@tabler/icons-react";
import { AppHeader } from "@/components/app-header";
import { JobDetailCard } from "@/components/jobs/job-detail-card";
import { Button } from "@/components/ui/button";
import {
  DIAGNOSTIC_ROUNDS,
  type DiagnosticRoundConfig,
} from "@/lib/diagnostics/rounds-config";
import type { JobDetail } from "@/lib/jd-client";
import { cn } from "@/lib/utils";

type JobDetailClientProps = {
  job: JobDetail;
  readyRoundIds?: string[];
  processingRoundIds?: string[];
  roundScores?: Record<string, number | null>;
  diagnosticId?: string | null;
  user: { email: string | null; name: string | null };
};

export function JobDetailClient({
  job,
  readyRoundIds = [],
  processingRoundIds = [],
  roundScores = {},
  diagnosticId,
  user,
}: JobDetailClientProps) {
  const router = useRouter();
  const [startingRoundId, setStartingRoundId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localReadyRoundIds, setLocalReadyRoundIds] = useState(readyRoundIds);
  const [localProcessingRoundIds, setLocalProcessingRoundIds] = useState(
    processingRoundIds,
  );
  const [localRoundScores, setLocalRoundScores] = useState(roundScores);

  const rounds = DIAGNOSTIC_ROUNDS.map((round, index) => ({
    ...round,
    isReportReady: localReadyRoundIds.includes(round.id),
    isReportProcessing: localProcessingRoundIds.includes(round.id),
    score: localRoundScores[round.id] ?? null,
    questions: job.rounds[index]?.competencies?.length
      ? job.rounds[index].competencies
      : round.questions,
  }));
  const activeRoundIndex = Math.max(
    rounds.findIndex(
      (round) => !round.isReportReady && !round.isReportProcessing,
    ),
    0,
  );
  const hasCompletedRound =
    localReadyRoundIds.length > 0 || localProcessingRoundIds.length > 0;

  useEffect(() => {
    setLocalReadyRoundIds(readyRoundIds);
    setLocalProcessingRoundIds(processingRoundIds);
    setLocalRoundScores(roundScores);
  }, [processingRoundIds, readyRoundIds, roundScores]);

  // While a round's report is still generating, refresh so the CTA flips to
  // "View Report" once it is ready.
  useEffect(() => {
    if (localProcessingRoundIds.length === 0) return;

    const intervalId = window.setInterval(() => {
      void fetch(`/api/jobs/${encodeURIComponent(job.jobId)}/round-status`, {
        cache: "no-store",
      })
        .then((response) => {
          if (!response.ok) return null;
          return response.json() as Promise<{
            processingRoundIds?: string[];
            readyRoundIds?: string[];
            roundScores?: Record<string, number | null>;
          }>;
        })
        .then((status) => {
          if (!status) return;
          setLocalReadyRoundIds(status.readyRoundIds ?? []);
          setLocalProcessingRoundIds(status.processingRoundIds ?? []);
          setLocalRoundScores(status.roundScores ?? {});
        })
        .catch(() => {
          router.refresh();
        });
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [job.jobId, localProcessingRoundIds.length, router]);

  async function handleStart(roundId: string) {
    if (startingRoundId) return;
    setStartingRoundId(roundId);
    setError(null);

    try {
      router.push(`/jobs/${job.jobId}/prejoin?round=${roundId}`);
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : "Failed to start diagnostics.",
      );
      setStartingRoundId(null);
    }
  }

  return (
    <main className="min-h-dvh bg-[#F6F3F8] font-sans text-black">
      <AppHeader user={user} />
      <section className="mx-auto w-full max-w-225 px-4 pb-14 pt-6">
        {!hasCompletedRound && (
          <button
            type="button"
            onClick={() => router.push("/jobs")}
            className="inline-flex items-center gap-2 text-base font-semibold text-black"
          >
            <ArrowLeft className="size-5" />
            Back
          </button>
        )}

        <div className="mt-8">
          <JobDetailCard
            companyName={job.companyName}
            description={job.roleSummary ?? undefined}
            experience={formatExperienceLabel(
              job.experienceMinYears,
              job.experienceMaxYears,
            )}
            overallScore={null}
            roundCount={rounds.length}
            sourceUrl={job.sourceUrl}
            jobTitle={job.jobTitle}
          />
        </div>

        <div className="mt-7 w-full rounded-t-3xl bg-[linear-gradient(180deg,#0B061E_0%,#3C2390_100%)] p-5 md:rounded-b-3xl md:p-8">
          <div className="space-y-3">
            {rounds.map((round, index) => {
              const roundNumber = index + 1;
              const isActive = index === activeRoundIndex;
              const isDone = round.isReportReady;
              const isProcessing = round.isReportProcessing;
              return (
                <RoundTimelineItem
                  key={round.id}
                  config={round}
                  diagnosticId={diagnosticId}
                  isCurrent={isActive}
                  isDone={isDone}
                  isLast={isLast(index, rounds.length)}
                  isProcessing={isProcessing}
                  questions={round.questions}
                  roundNumber={roundNumber}
                  score={round.score}
                  startingRoundId={startingRoundId}
                  onStart={() => handleStart(round.id)}
                  onViewReport={() => router.push(`/report/${diagnosticId}`)}
                />
              );
            })}
          </div>
        </div>

        {error ? (
          <div className="mt-4 w-full rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function RoundTimelineItem({
  config,
  diagnosticId,
  isCurrent,
  isDone,
  isLast,
  isProcessing,
  onStart,
  onViewReport,
  questions,
  roundNumber,
  score,
  startingRoundId,
}: {
  config: DiagnosticRoundConfig;
  diagnosticId?: string | null;
  isCurrent: boolean;
  isDone: boolean;
  isLast: boolean;
  isProcessing: boolean;
  onStart: () => void;
  onViewReport: () => void;
  questions: string[];
  roundNumber: number;
  score: number | null;
  startingRoundId: string | null;
}) {
  const showQuestions = !isDone && !isProcessing;
  const isActiveCard = isCurrent && !isProcessing;

  return (
    <article className="relative grid grid-cols-[3rem_1fr] gap-x-2 gap-y-2 md:gap-x-4 md:gap-y-0">
      <div className="flex items-center justify-center">
        <RoundStateIcon
          config={config}
          isCurrent={isCurrent}
          isDone={isDone || isProcessing}
        />
      </div>

      <div className="flex min-w-0 items-center justify-between gap-3">
        <span
          className={cn(
            "text-xs font-semibold uppercase tracking-[0.12em]",
            isActiveCard
              ? "text-purple-400"
               : isDone || isProcessing
                 ? "text-[#3DD24A]"
                 : "text-white/40",
          )}
        >
          ROUND {roundNumber}
        </span>
        <span
          className={cn(
            "rounded-full px-4 py-1.5 text-xs font-semibold text-white",
            isActiveCard
              ? "border border-white/25 bg-white/10"
              : "bg-white/10",
          )}
        >
          {config.duration}
        </span>
      </div>

      <div className="hidden justify-center md:flex">
        {!isLast && (
          <div
            className={cn(
              "hidden h-full min-h-28 w-1 rounded-full md:block",
              isActiveCard
                ? "bg-[linear-gradient(180deg,rgba(108,71,255,0.75)_0%,rgba(0,180,0,0)_100%)]"
                : isDone || isProcessing
                  ? "bg-[linear-gradient(180deg,rgba(61,210,74,0.75)_0%,rgba(0,180,0,0)_100%)]"
                  : "bg-[linear-gradient(180deg,rgba(255,255,255,0.24)_0%,rgba(255,255,255,0)_100%)]",
            )}
          />
        )}
      </div>

      <div className="col-span-2 min-w-0 pb-6 md:col-span-1">
        <div
          className={cn(
            "rounded-2xl border p-5 transition md:p-6",
            isActiveCard
              ? "border-white/80 bg-white shadow-sm"
              : "border-white/15 bg-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.12)]",
          )}
        >
          <div
            className={cn(
              "grid gap-4",
              isDone || isProcessing
                ? "md:grid-cols-[minmax(0,1fr)_auto] md:gap-5"
                : "md:grid-cols-1",
            )}
          >
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3">
                <h2
                  className={cn(
                    "text-base font-semibold tracking-tight",
                    isActiveCard ? "text-foreground" : "text-white",
                  )}
                >
                  {config.title}
                </h2>
                {isDone ? (
                  <span className="md:hidden">
                    <RoundResultBadge score={score} />
                  </span>
                ) : null}
              </div>
              <p
                className={cn(
                  "mt-2 max-w-3xl text-sm leading-6",
                  isActiveCard
                    ? "text-muted-foreground"
                    : "text-white/55",
                )}
              >
                {config.description}
              </p>
              {isDone && diagnosticId ? (
                <div className="mt-3 flex justify-end md:hidden">
                  <Button
                    className="h-auto rounded-none border-0 bg-transparent p-0 text-sm font-medium text-[#A991F4] shadow-none hover:bg-transparent hover:text-[#C4B5FD]"
                    variant="ghost"
                    type="button"
                    onClick={onViewReport}
                  >
                    View report
                  </Button>
                </div>
              ) : null}
            </div>

            {isDone && diagnosticId ? (
              <div className="hidden shrink-0 flex-col items-end justify-between gap-6 md:flex">
                <RoundResultBadge score={score} />
                <Button
                  className="h-auto rounded-none border-0 bg-transparent p-0 text-sm font-medium text-[#A991F4] shadow-none hover:bg-transparent hover:text-[#C4B5FD]"
                  variant="ghost"
                  type="button"
                  onClick={onViewReport}
                >
                  View report
                </Button>
              </div>
            ) : null}

            {isProcessing ? (
              <div className="flex shrink-0 items-start justify-start md:items-center md:justify-end">
                <span className="text-sm font-medium text-white/80">
                  Calculating your report
                </span>
              </div>
            ) : null}
          </div>

          {showQuestions && (
            <div className="grid items-end gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <p
                  className={cn(
                    "mt-4 text-sm font-medium",
                    isActiveCard ? "text-[#6B6B7A]" : "text-white/60",
                  )}
                >
                  Questions may cover
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {questions.map((question) => (
                    <span
                      key={question}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs",
                        isActiveCard
                          ? "border-border bg-muted/50 text-gray-600"
                          : "border-white/15 bg-white/10 text-white/70",
                      )}
                    >
                      {question}
                    </span>
                  ))}
                </div>
              </div>

              {!isProcessing ? (
                <Button
                  className="col-span-2 w-full rounded-full border-0 bg-button px-10 py-6 shadow-none md:col-span-1 md:ml-auto"
                  disabled={Boolean(startingRoundId)}
                  type="button"
                  size="lg"
                  onClick={onStart}
                >
                  {startingRoundId === config.id ? (
                    <>
                      <LoaderCircle className="mr-1 size-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="mr-1 size-3 fill-current" />
                      Start Round {roundNumber}
                    </>
                  )}
                </Button>
              ) : null}
            </div>
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
}: {
  config: DiagnosticRoundConfig;
  isCurrent: boolean;
  isDone: boolean;
}) {
  const Icon = getRoundIcon(config.id);

  return (
    <div
      className={cn(
        "relative z-10 flex size-10 items-center justify-center rounded-full border-2 md:size-12",
        isDone
          ? "border-emerald-500 bg-[linear-gradient(180deg,#3DD24A_0%,#00B400_100%)] text-white"
          : isCurrent
            ? "border-[#6C47FF] bg-[#6C47FF] text-white"
            : "border-white/20 bg-[#1a0b2e] text-white/40",
      )}
    >
      {isDone ? <CheckIcon className="size-5" /> : <Icon className="size-5" />}
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
        "rounded-full px-4 py-1 text-xs font-semibold text-white",
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
    return { label: "Completed", className: "bg-[#4D8F62]" };
  }

  if (score >= 90) return { label: "Excellent", className: "bg-[#4D8F62]" };
  if (score >= 70) return { label: "Good", className: "bg-[#F49B22]" };
  if (score >= 50) return { label: "Average", className: "bg-[#DE7B48]" };
  return { label: "Poor", className: "bg-[#C7433F]" };
}

function formatExperienceLabel(min: number | null, max: number | null) {
  if (min == null && max == null) return "";
  if (min != null && max != null) return `${min}-${max} years`;
  if (min != null) return `${min}+ years`;
  return `Up to ${max} years`;
}

function isLast(index: number, length: number) {
  return index === length - 1;
}
