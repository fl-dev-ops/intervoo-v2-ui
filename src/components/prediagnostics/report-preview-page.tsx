"use client";

import {
  BriefcaseBusiness,
  CheckCircle2,
  Circle,
  Loader2,
  Shield,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { IntervooLogo } from "@/components/login/intervoo-logo";
import { buttonVariants } from "@/components/ui/button";

const REPORT_GENERATION_STEPS = [
  { label: "Job target captured" },
  { label: "Skill analysis" },
  { label: "Role level understanding" },
  { label: "Company level knowledge" },
  { label: "JD awareness" },
] as const;

const READY_STEP_REVEAL_DELAY_MS = 280;
const READY_REPORT_DELAY_MS = 500;
const REPORT_REFRESH_DELAY_MS = 2500;

type ResearchBreakdownKey =
  | "skills_research"
  | "company_clarity"
  | "jd_awareness"
  | "tools_and_role_clarity"
  | "salary_clarity";

export type PrediagnosticsReportPreviewReport = {
  dream_job: string | null;
  aiming_for: string | null;
  backup: string | null;
  salary_expectation: string | null;
  reasoning: string | null;
  companies_mentioned: string[];
  roles_mentioned: string[];
  job_awareness_category: "Unclear" | "Clear" | "Strong";
  job_research_category: "Not Enough" | "Good" | "Strong" | null;
  job_research_breakdown: Record<ResearchBreakdownKey, string> | null;
};

export type PrediagnosticsReportPageState = {
  preferredName?: string | null;
} & (
  | {
      status: "ready";
      report: PrediagnosticsReportPreviewReport;
      errorMessage?: null;
    }
  | {
      status: "pending" | "processing" | "failed" | "unavailable";
      report?: null;
      errorMessage?: string | null;
    }
);

export function PrediagnosticsReportPreviewPage({
  showActions = true,
  state,
}: {
  showActions?: boolean;
  state: PrediagnosticsReportPageState;
}) {
  const isGenerating =
    state.status === "pending" || state.status === "processing";
  const wasGeneratingRef = useRef(isGenerating);
  const [showReadyChecklist, setShowReadyChecklist] = useState(false);
  const [readyChecklistComplete, setReadyChecklistComplete] = useState(false);
  const shouldShowReadyChecklist =
    state.status === "ready" &&
    !readyChecklistComplete &&
    (showReadyChecklist || wasGeneratingRef.current);

  useReportRefresh(isGenerating);

  useEffect(() => {
    if (state.status === "ready" && wasGeneratingRef.current) {
      setShowReadyChecklist(true);
      setReadyChecklistComplete(false);
    }

    if (state.status !== "ready") {
      setShowReadyChecklist(false);
      setReadyChecklistComplete(false);
    }

    wasGeneratingRef.current = isGenerating;
  }, [isGenerating, state.status]);

  if (state.status === "ready") {
    if (shouldShowReadyChecklist) {
      return (
        <PrediagnosticsGenerationState
          ready
          onComplete={() => setReadyChecklistComplete(true)}
        />
      );
    }

    return (
      <PrediagnosticsReportPreview
        preferredName={state.preferredName}
        report={state.report}
        showActions={showActions}
      />
    );
  }

  if (isGenerating) {
    return <PrediagnosticsGenerationState />;
  }

  return (
    <PrediagnosticsReportErrorState
      message={state.errorMessage ?? "Failed to load report."}
      showActions={showActions}
    />
  );
}

function useReportRefresh(isGenerating: boolean) {
  const router = useRouter();

  useEffect(() => {
    if (!isGenerating) {
      return;
    }

    const intervalId = window.setInterval(() => {
      router.refresh();
    }, REPORT_REFRESH_DELAY_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isGenerating, router]);
}

function PrediagnosticsGenerationState({
  onComplete,
  ready = false,
}: {
  onComplete?: () => void;
  ready?: boolean;
}) {
  const [completedSteps, setCompletedSteps] = useState(0);

  useEffect(() => {
    if (!ready) {
      setCompletedSteps(0);
      return;
    }

    if (completedSteps === REPORT_GENERATION_STEPS.length) {
      const timeoutId = window.setTimeout(() => {
        onComplete?.();
      }, READY_REPORT_DELAY_MS);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    const timeoutId = window.setTimeout(() => {
      setCompletedSteps((current) =>
        Math.min(current + 1, REPORT_GENERATION_STEPS.length),
      );
    }, READY_STEP_REVEAL_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [completedSteps, onComplete, ready]);

  return (
    <main className="grid min-h-svh place-items-center bg-background px-5 py-8 text-foreground">
      <section className="mx-auto w-full max-w-md text-center">
        <IntervooLogo className="mx-auto h-14 w-auto text-foreground" />

        <div className="mt-8 rounded-xl border border-border bg-card p-5 text-left shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-input/30 text-muted-foreground">
              {ready ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin" />
              )}
            </span>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Pre-diagnostic report
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                {ready ? "Report is ready" : "Preparing your report"}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {ready
                  ? "Final checks are complete. Opening your report now."
                  : "We are analyzing your conversation. This page refreshes automatically."}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-left">
            {REPORT_GENERATION_STEPS.map((step, index) => (
              <GenerationStepRow
                complete={index < completedSteps}
                key={step.label}
                label={step.label}
              />
            ))}
          </div>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            {ready
              ? "Your report will open automatically."
              : "Checklist completion starts once the report is ready."}
          </p>
        </div>
      </section>
    </main>
  );
}

function PrediagnosticsReportErrorState(props: {
  message: string;
  showActions: boolean;
}) {
  return (
    <div className="grid min-h-svh place-items-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <h2 className="text-xl font-semibold text-foreground">
          Report unavailable
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {props.message}
        </p>
        {props.showActions ? (
          <Link
            className={buttonVariants({ className: "mt-6 w-full", size: "lg" })}
            href="/prediagnostics"
          >
            Back to start
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function PrediagnosticsReportPreview({
  preferredName,
  report,
  showActions,
}: {
  preferredName?: string | null;
  report: PrediagnosticsReportPreviewReport;
  showActions: boolean;
}) {
  const displayName = preferredName?.trim() || "there";
  const jobGoalBadge = getPositiveBadge(report.job_awareness_category);
  const awarenessBadge = getPositiveBadge(
    report.job_research_category ?? "Not Enough",
  );

  return (
    <div className="min-h-svh">
      <div className="mx-auto w-full max-w-md md:max-w-lg">
        <div className="p-5 sm:p-6">
          <div className="rounded-xl px-5 pt-4 text-center">
            <p className="text-2xl font-medium text-foreground">
              Hi {displayName}
            </p>
            <h1 className="mt-1 text-base text-muted-foreground">
              Here is your pre-diagnostics report
            </h1>
          </div>

          <div className="mt-5 space-y-4">
            <section className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                  <div className="text-base font-semibold text-foreground">
                    Your job goal
                  </div>
                </div>
                <ReportBadge
                  color={jobGoalBadge.color}
                  label={jobGoalBadge.label}
                />
              </div>

              <div className="mt-4 space-y-2.5">
                <InfoCard
                  icon={<BriefcaseBusiness className="h-4 w-4" />}
                  iconClassName="bg-primary/10 text-primary"
                  title="Your dream job"
                  value={report.dream_job || "Not captured yet"}
                />
                <InfoCard
                  icon={<Target className="h-4 w-4" />}
                  iconClassName="bg-primary/10 text-primary"
                  title="Your target (Current focus)"
                  value={report.aiming_for || "Not captured yet"}
                />
                <InfoCard
                  icon={<Shield className="h-4 w-4" />}
                  iconClassName="bg-primary/10 text-primary"
                  title="Your backup"
                  value={report.backup || "Not captured yet"}
                />
              </div>

              {report.reasoning ? (
                <div className="mt-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm leading-6 text-amber-700 dark:text-amber-300">
                  <span className="font-semibold">Why this goal fits you:</span>{" "}
                  {report.reasoning}
                </div>
              ) : null}
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                  <div className="text-base font-semibold text-foreground">
                    Your job awareness
                  </div>
                </div>
                <ReportBadge
                  color={awarenessBadge.color}
                  label={awarenessBadge.label}
                />
              </div>

              <div className="mt-4 grid gap-1 text-sm leading-7 text-muted-foreground">
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.06em] text-foreground">
                  You are clear about
                </div>
                <AwarenessRow
                  label="Skills research"
                  positive
                  value={getReportBreakdownValue(report, "skills_research")}
                />
                <AwarenessRow
                  label="Company knowledge"
                  value={getReportBreakdownValue(report, "company_clarity")}
                />
              </div>

              <div className="mt-4 grid gap-1 text-sm leading-7 text-muted-foreground">
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.06em] text-foreground">
                  Need improvement
                </div>
                <AwarenessRow
                  label="JD awareness"
                  value={getReportBreakdownValue(report, "jd_awareness")}
                  warning
                />
                <AwarenessRow
                  label="Role clarity"
                  value={getReportBreakdownValue(
                    report,
                    "tools_and_role_clarity",
                  )}
                  warning
                />
                <AwarenessRow
                  label="Salary understanding"
                  value={getReportBreakdownValue(report, "salary_clarity")}
                  warning
                />
              </div>

              <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm leading-6 text-amber-700 dark:text-amber-300">
                Some key areas are not clear yet. Improving them will help you
                perform better in interviews.
              </div>
            </section>

            {showActions ? (
              <section className="my-12 rounded-xl px-5 text-center">
                <h2 className="text-[1.35rem] font-semibold tracking-[-0.02em] text-foreground">
                  Ready for your diagnostic interview?
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Choose the job band you want to practice for and start a full
                  video diagnostic interview.
                </p>
                <Link
                  className={buttonVariants({
                    className: "mt-6 w-full",
                    size: "lg",
                  })}
                  href="/diagnostics"
                >
                  Start Diagnostic Interview
                </Link>
                <Link
                  className={buttonVariants({
                    className: "mt-3 w-full",
                    size: "lg",
                    variant: "outline",
                  })}
                  href="/prediagnostics?redo=true"
                >
                  Retake Pre Diagnostics
                </Link>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportBadge(props: { label: string; color: "green" | "amber" }) {
  const className =
    props.color === "green"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";

  return (
    <div
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${className}`}
    >
      {props.label}
    </div>
  );
}

function InfoCard(props: {
  icon: ReactNode;
  iconClassName: string;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full ${props.iconClassName}`}
        >
          {props.icon}
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">
            {props.title}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {props.value}
          </div>
        </div>
      </div>
    </div>
  );
}

function AwarenessRow(props: {
  label: string;
  value: string;
  positive?: boolean;
  warning?: boolean;
}) {
  const normalizedValue = props.value.trim().toLowerCase();
  const valueClassName =
    normalizedValue === "not yet"
      ? "text-red-500"
      : props.positive
        ? "text-emerald-600 dark:text-emerald-400"
        : props.warning
          ? "text-amber-600 dark:text-amber-400"
          : "text-emerald-600 dark:text-emerald-400";

  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>{props.label}</span>
      </div>
      <span className={`text-right font-medium ${valueClassName}`}>
        {props.value}
      </span>
    </div>
  );
}

function GenerationStepRow(props: { label: string; complete: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2.5">
      <span className="shrink-0 transition-colors">
        {props.complete ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground/35" />
        )}
      </span>
      <span className="text-sm font-medium text-foreground">{props.label}</span>
    </div>
  );
}

function getReportBreakdownValue(
  report: PrediagnosticsReportPreviewReport,
  key: ResearchBreakdownKey,
) {
  return report.job_research_breakdown?.[key] ?? "Not yet";
}

function getPositiveBadge(value: string) {
  const normalized = value.trim().toLowerCase();

  if (
    normalized === "strong" ||
    normalized === "good" ||
    normalized === "clear"
  ) {
    return { color: "green" as const, label: value };
  }

  return { color: "amber" as const, label: value };
}
