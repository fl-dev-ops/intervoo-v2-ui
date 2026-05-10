"use client";

import {
  Brain,
  Check,
  Code,
  FileText,
  Loader2,
  Lock,
  MessageSquare,
  Play,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { DiagnosticJobOption } from "@/lib/diagnostics/job-options";
import {
  DIAGNOSTIC_ROUNDS,
  type DiagnosticRoundConfig,
} from "@/lib/diagnostics/rounds-config";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, ReactNode> = {
  MessageSquare: <MessageSquare className="h-5 w-5" />,
  Code: <Code className="h-5 w-5" />,
  Brain: <Brain className="h-5 w-5" />,
  Users: <Users className="h-5 w-5" />,
};

const readinessChartData = [
  { label: "readiness", noHire: 50, hold: 20, hire: 20, strongHire: 10 },
];

const readinessChartConfig = {
  noHire: { label: "No Hire", color: "#e4e4e7" },
  hold: { label: "Hold", color: "#d4d4d8" },
  hire: { label: "Hire", color: "#c4b5fd" },
  strongHire: { label: "Strong Hire", color: "#8b5cf6" },
} satisfies ChartConfig;

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
  diagnostic,
  initialRounds,
  selectedJob,
  allCompleted,
  completedCount,
  reportsReadyCount,
}: {
  diagnostic: {
    id: string;
    status: string;
    finalReport: unknown;
    finalReportShareToken: string | null;
  };
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
  const [generatingFinal, setGeneratingFinal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hasPendingReports = initialRounds.some(
      (round) =>
        round.reportStatus === "PENDING" || round.reportStatus === "PROCESSING",
    );

    if (!hasPendingReports && !generatingFinal) {
      return;
    }

    const intervalId = window.setInterval(() => {
      router.refresh();
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [initialRounds, generatingFinal, router]);

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

  async function handleGenerateFinalReport() {
    setError(null);
    setGeneratingFinal(true);

    try {
      const response = await fetch("/api/diagnostics/final-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diagnosticId: diagnostic.id }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to generate final report.");
      }

      router.push("/diagnostics/final-report");
      router.refresh();
    } catch (finalError) {
      setError(
        finalError instanceof Error
          ? finalError.message
          : "Failed to generate final report.",
      );
    } finally {
      setGeneratingFinal(false);
    }
  }

  const activeRoundNumber = Math.min(
    completedCount + 1,
    DIAGNOSTIC_ROUNDS.length,
  );

  return (
    <main className="min-h-svh bg-background px-5 py-8 text-foreground">
      <section className="mx-auto w-full max-w-4xl">
        <div className="grid gap-5 rounded-xl border border-border bg-card p-5 shadow-sm lg:grid-cols-[1fr_18rem] lg:p-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Diagnostics
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              {selectedJob.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              {selectedJob.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-border bg-input/30 px-3 py-1.5 text-xs font-medium text-foreground">
                {selectedJob.salary}
              </span>
              <span className="rounded-full border border-border bg-input/30 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                {selectedJob.companies.join(",  ")}
              </span>
            </div>
          </div>

          {/*<ReadinessScoreCard />*/}
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card px-4 py-6 shadow-sm sm:px-6">
          <div className="relative mx-auto max-w-4xl">
            <div className="absolute top-14 bottom-20 left-8 hidden w-px bg-border sm:block" />
            <div className="space-y-5">
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
        </div>

        <FinalReportPanel
          allCompleted={allCompleted}
          finalReportReady={Boolean(diagnostic.finalReport)}
          generatingFinal={generatingFinal}
          reportsReadyCount={reportsReadyCount}
          onGenerateFinal={handleGenerateFinalReport}
        />

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function ReadinessScoreCard() {
  return (
    <Card className="gap-3 rounded-xl border-border bg-input/30 py-4 shadow-none">
      <CardHeader className="items-center px-4 pb-0">
        <CardTitle className="text-base font-semibold text-muted-foreground">
          Interview Readiness Score
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-0">
        <ChartContainer
          config={readinessChartConfig}
          className="mx-auto aspect-[1.7] w-full max-w-[280px]"
        >
          <RadialBarChart
            data={readinessChartData}
            endAngle={180}
            innerRadius={58}
            outerRadius={86}
            startAngle={0}
          >
            <RadialBar
              className="stroke-transparent stroke-2"
              cornerRadius={6}
              dataKey="noHire"
              fill="var(--color-noHire)"
              stackId="a"
            />
            <RadialBar
              className="stroke-transparent stroke-2"
              cornerRadius={6}
              dataKey="hold"
              fill="var(--color-hold)"
              stackId="a"
            />
            <RadialBar
              className="stroke-transparent stroke-2"
              cornerRadius={6}
              dataKey="hire"
              fill="var(--color-hire)"
              stackId="a"
            />
            <RadialBar
              className="stroke-transparent stroke-2"
              cornerRadius={6}
              dataKey="strongHire"
              fill="var(--color-strongHire)"
              stackId="a"
            />
            <ChartTooltip
              content={<ChartTooltipContent hideLabel />}
              cursor={false}
            />
            <PolarRadiusAxis axisLine={false} tick={false} tickLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text textAnchor="middle" x={viewBox.cx} y={viewBox.cy}>
                        <tspan
                          className="fill-foreground text-2xl font-semibold"
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 6}
                        >
                          --/100
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
        <div className="-mt-4 grid grid-cols-4 gap-1 text-center text-[0.65rem] leading-4 text-muted-foreground">
          <span>
            No Hire
            <br />
            0-50
          </span>
          <span>
            Hold
            <br />
            51-70
          </span>
          <span>
            Hire
            <br />
            71-90
          </span>
          <span>
            Strong
            <br />
            91-100
          </span>
        </div>
      </CardContent>
    </Card>
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
  const muted = isLocked || isStarted;

  return (
    <article className="relative grid gap-4 sm:grid-cols-[3.5rem_1fr]">
      <div className="hidden sm:block">
        <div
          className={cn(
            "relative z-10 grid h-12 w-12 place-items-center rounded-full border bg-card",
            isCompleted
              ? "border-emerald-500/30 text-emerald-600"
              : isActive
                ? "border-foreground text-foreground"
                : "border-border text-muted-foreground",
          )}
        >
          {isCompleted ? (
            <Check className="h-6 w-6" />
          ) : isLocked ? (
            <Lock className="h-5 w-5" />
          ) : (
            ICON_MAP[config.iconName]
          )}
        </div>
      </div>

      <div className={cn("transition", muted ? "opacity-60" : "opacity-100")}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Round {roundNumber}
          </div>
          <span className="rounded-full border border-border bg-input/30 px-3 py-1 text-xs font-medium text-muted-foreground">
            {config.duration}
          </span>
        </div>

        <div
          className={cn(
            "rounded-xl border p-4 shadow-sm transition sm:p-5",
            isActive
              ? "border-foreground bg-background"
              : "border-border bg-input/30",
          )}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                {config.title}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {config.description}
              </p>

              {isActive ? (
                <div className="mt-5">
                  <p className="text-sm font-medium text-foreground">
                    Questions may cover
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {config.questions.map((question) => (
                      <span
                        key={question}
                        className="rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground"
                      >
                        {question}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <RoundAction
              isActive={isActive}
              isCompleted={isCompleted}
              isGenerating={isGenerating}
              isLocked={isLocked}
              isStarted={isStarted}
              onGenerateReport={onGenerateReport}
              onStart={onStart}
              roundData={roundData}
              roundNumber={roundNumber}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function RoundAction({
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
  if (isActive) {
    return (
      <button
        className={buttonVariants({
          className: "h-10 shrink-0 px-5",
          size: "lg",
        })}
        type="button"
        onClick={onStart}
      >
        <Play className="mr-2 h-4 w-4 fill-current" />
        Start Round {roundNumber}
      </button>
    );
  }

  if (isLocked) {
    return (
      <span className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-muted-foreground">
        <Lock className="mr-2 h-4 w-4" />
        Locked
      </span>
    );
  }

  if (isStarted) {
    return (
      <span className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-muted-foreground">
        Session started
      </span>
    );
  }

  if (!isCompleted || !roundData) {
    return null;
  }

  if (roundData.reportStatus === "READY" && roundData.reportShareToken) {
    return (
      <a
        className={buttonVariants({
          className: "h-10 shrink-0 px-5",
          size: "lg",
          variant: "secondary",
        })}
        href={`/d/${roundData.reportShareToken}`}
        rel="noopener noreferrer"
        target="_blank"
      >
        <FileText className="mr-2 h-4 w-4" />
        View Report
      </a>
    );
  }

  const isProcessing =
    roundData.reportStatus === "PENDING" ||
    roundData.reportStatus === "PROCESSING";

  return (
    <button
      className={buttonVariants({
        className: "h-10 shrink-0 px-5",
        size: "lg",
        variant: "secondary",
      })}
      disabled={isGenerating || isProcessing}
      type="button"
      onClick={onGenerateReport}
    >
      {isGenerating || isProcessing ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <FileText className="mr-2 h-4 w-4" />
      )}
      {isProcessing
        ? "Report processing"
        : roundData.reportStatus === "FAILED"
          ? "Retry Report"
          : "Generate Report"}
    </button>
  );
}

function FinalReportPanel({
  allCompleted,
  finalReportReady,
  generatingFinal,
  reportsReadyCount,
  onGenerateFinal,
}: {
  allCompleted: boolean;
  finalReportReady: boolean;
  generatingFinal: boolean;
  reportsReadyCount: number;
  onGenerateFinal: () => void;
}) {
  if (!allCompleted) {
    return null;
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-5 text-center shadow-sm sm:p-6">
      {finalReportReady ? (
        <a
          className={buttonVariants({
            className: "px-6",
            size: "lg",
          })}
          href="/diagnostics/final-report"
        >
          View Final Diagnostic Report
        </a>
      ) : reportsReadyCount === DIAGNOSTIC_ROUNDS.length ? (
        <button
          className={buttonVariants({
            className: "px-6",
            size: "lg",
          })}
          disabled={generatingFinal}
          type="button"
          onClick={onGenerateFinal}
        >
          {generatingFinal ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {generatingFinal
            ? "Generating final report..."
            : "Generate Final Report"}
        </button>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">
          All rounds are complete. {reportsReadyCount} of{" "}
          {DIAGNOSTIC_ROUNDS.length} round reports are ready. Generate or wait
          for the remaining reports to unlock the final diagnostic report.
        </p>
      )}
    </div>
  );
}
