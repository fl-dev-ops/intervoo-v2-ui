"use client";

import { ArrowLeft, Lock, Play, User } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { InterviewReadinessScore } from "@/components/diagnostics/interview-readiness-score";
import type { DiagnosticJobOption } from "@/lib/diagnostics/job-options";
import {
  DIAGNOSTIC_ROUNDS,
  type DiagnosticRoundConfig,
} from "@/lib/diagnostics/rounds-config";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

type RoundData = {
  id: string;
  roundType: string;
  roundNumber: number;
  status: string;
  sessionId: string;
  reportStatus: string | null;
  reportShareToken: string | null;
};

export function DiagnosticsRoundsClient({
  initialRounds,
  selectedJob,
  allCompleted,
  completedCount,
  reportsReadyCount,
}: {
  initialRounds: RoundData[];
  selectedJob: DiagnosticJobOption;
  allCompleted: boolean;
  completedCount: number;
  reportsReadyCount: number;
}) {
  const router = useRouter();
  const [generatingReports, setGeneratingReports] = useState<Set<string>>(
    new Set(),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hasPendingReports = initialRounds.some(
      (round) =>
        round.reportStatus === "PENDING" || round.reportStatus === "PROCESSING",
    );

    if (!hasPendingReports) {
      return;
    }

    const intervalId = window.setInterval(() => {
      router.refresh();
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [initialRounds, router]);

  async function handleGenerateReport(sessionId: string) {
    setError(null);
    setGeneratingReports((prev) => new Set(prev).add(sessionId));

    try {
      const response = await fetch("/api/diagnostics/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to generate report.");
      }

      router.refresh();
    } catch (reportError) {
      setError(
        reportError instanceof Error
          ? reportError.message
          : "Failed to generate report.",
      );
    } finally {
      setGeneratingReports((prev) => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
    }
  }

  const activeRoundNumber = Math.min(
    completedCount + 1,
    DIAGNOSTIC_ROUNDS.length,
  );

  return (
    <main className="min-h-svh p-3 md:pb-10 bg-lavender">
      <div className="z-100 p-3 absolute top-0 left-0 shadow md:shadow-none md:relative w-full flex flex-row items-center justify-between pb-4 bg-background md:bg-transparent">
        {/* Back button */}
        <button
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => router.push("/diagnostics/selection")}
          type="button"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <span className="md:hidden shrink-0 rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white">
          {selectedJob.salary}
        </span>
      </div>

      <section className="mx-auto w-full max-w-4xl mt-14 md:mt-0">
        {/* Header Card */}
        <div className="rounded-2xl md:border border-border bg-transparent md:bg-card p-2 md:p-6 shadow-none md:shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            {/* Job Info */}
            <div className="flex-1 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                    {selectedJob.title}
                  </h1>
                  <p className="mt-2 max-w-xl text-sm text-muted-foreground leading-6">
                    {selectedJob.description}
                  </p>
                  <span className="mt-3 w-fit hidden md:block shrink-0 rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white">
                    {selectedJob.salary}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedJob.companies.map((company) => (
                  <span
                    key={company}
                    className="rounded-full border border-border bg-[#EBE6EF] px-3 py-1 text-xs font-medium text-primary"
                  >
                    {company}
                  </span>
                ))}
              </div>
            </div>

            {/* Interview Readiness Score */}
            <div className="shrink-0 lg:pl-6">
              <InterviewReadinessScore />
            </div>
          </div>
        </div>

        {/* Rounds Timeline - Dark Purple Container */}
        <div className="mt-3 rounded-3xl bg-[linear-gradient(180deg,#0B061E_0%,#3C2390_100%)] p-4 sm:p-8">
          <div className="relative mx-auto max-w-4xl">
            {/* Vertical connecting line */}
            <div className="absolute top-12 bottom-12 left-6 hidden w-px bg-white/10 sm:block" />

            <div className="space-y-6">
              {DIAGNOSTIC_ROUNDS.map((roundConfig, index) => {
                const roundNumber = index + 1;
                const roundData = initialRounds.find(
                  (round) => round.roundType === roundConfig.id,
                );
                const isCompleted =
                  roundData?.status === "COMPLETED" ||
                  roundData?.status === "REPORT_READY";
                const isStarted = Boolean(roundData) && !isCompleted;
                const isActive =
                  !roundData && roundNumber === activeRoundNumber;
                const isLocked = !roundData && roundNumber > activeRoundNumber;

                return (
                  <RoundTimelineItem
                    key={roundConfig.id}
                    config={roundConfig}
                    isActive={isActive}
                    isCompleted={isCompleted}
                    isGenerating={
                      roundData
                        ? generatingReports.has(roundData.sessionId)
                        : false
                    }
                    isLocked={isLocked}
                    isStarted={isStarted}
                    roundData={roundData}
                    roundNumber={roundNumber}
                    onGenerateReport={() =>
                      roundData && handleGenerateReport(roundData.sessionId)
                    }
                    onStart={() =>
                      router.push(
                        `/diagnostics/prejoin?round=${roundConfig.id}`,
                      )
                    }
                  />
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

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function RoundTimelineItem({
  config,
  isActive,
  isCompleted,
  isGenerating,
  isLocked,
  isStarted,
  onGenerateReport,
  onStart,
  roundData,
  roundNumber,
}: {
  config: DiagnosticRoundConfig;
  isActive: boolean;
  isCompleted: boolean;
  isGenerating: boolean;
  isLocked: boolean;
  isStarted: boolean;
  onGenerateReport: () => void;
  onStart: () => void;
  roundData: RoundData | undefined;
  roundNumber: number;
}) {
  return (
    <article className="relative flex gap-4">
      {/* Left icon column */}
      <div className="hidden md:flex relative shrink-0 flex-col items-center">
        <div
          className={cn(
            "relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2",
            isActive
              ? "border-purple-500 bg-purple-500 text-white"
              : isCompleted
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-white/20 bg-[#1a0b2e] text-white/40",
          )}
        >
          {isActive ? (
            <User className="h-5 w-5" />
          ) : isLocked ? (
            <Lock className="h-4 w-4" />
          ) : (
            <User className="h-5 w-5" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className={cn("flex-1")}>
        {/* Round header */}
        <div className="flex mb-3 items-center justify-between">
          <span
            className={cn(
              "text-xs font-semibold uppercase tracking-[0.12em]",
              isActive
                ? "text-purple-400"
                : isCompleted
                  ? "text-emerald-400"
                  : "text-white/40",
            )}
          >
            ROUND {roundNumber}
          </span>
          <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-white">
            {config.duration}
          </span>
        </div>

        {/* Card */}
        <div
          className={cn(
            "rounded-2xl border p-5 transition",
            isActive
              ? "border-white/10 bg-white shadow-sm"
              : "border-white/10 bg-white/10",
          )}
        >
          <h2
            className={cn(
              "text-lg font-semibold tracking-tight",
              isActive ? "text-foreground" : "text-white/80",
            )}
          >
            {config.title}
          </h2>
          <p
            className={cn(
              "mt-2 max-w-3xl text-sm leading-6",
              isActive ? "text-muted-foreground" : "text-white/50",
            )}
          >
            {config.description}
          </p>

          {isActive && (
            <div className="grid md:grid-cols-3 items-end gap-3">
              <div className="col-span-2">
                <p className="mt-4 text-sm font-medium text-foreground">
                  Questions may cover
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {config.questions.map((question) => (
                    <span
                      key={question}
                      className="rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground"
                    >
                      {question}
                    </span>
                  ))}
                </div>
              </div>

              <Button
                className="w-fit bg-button rounded-full px-10"
                type="button"
                onClick={onStart}
              >
                <Play className="size-3 fill-current mr-1" />
                Start Round {roundNumber}
              </Button>
            </div>
          )}

          {isCompleted && roundData && (
            <RoundAction
              isCompleted={isCompleted}
              isGenerating={isGenerating}
              onGenerateReport={onGenerateReport}
              roundData={roundData}
            />
          )}
        </div>
      </div>
    </article>
  );
}

function RoundAction({
  isCompleted,
  isGenerating,
  onGenerateReport,
  roundData,
}: {
  isCompleted: boolean;
  isGenerating: boolean;
  onGenerateReport: () => void;
  roundData: RoundData;
}) {
  if (!isCompleted || !roundData) {
    return null;
  }

  if (roundData.reportStatus === "READY" && roundData.reportShareToken) {
    return (
      <div className="mt-4 flex justify-end">
        <a
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium text-white transition hover:bg-white/20"
          href={`/d/${roundData.reportShareToken}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          View Report
        </a>
      </div>
    );
  }

  const isProcessing =
    roundData.reportStatus === "PENDING" ||
    roundData.reportStatus === "PROCESSING";

  return (
    <div className="mt-4 flex justify-end">
      <button
        className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
        disabled={isGenerating || isProcessing}
        type="button"
        onClick={onGenerateReport}
      >
        {isGenerating || isProcessing ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : null}
        {isProcessing
          ? "Report processing"
          : roundData.reportStatus === "FAILED"
            ? "Retry Report"
            : "Generate Report"}
      </button>
    </div>
  );
}
