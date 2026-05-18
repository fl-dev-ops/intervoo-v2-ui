"use client";

import {
  CheckIcon,
  Circle,
  Loader2,
  Shield,
  Target,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const REPORT_GENERATION_STEPS = [
  { label: "Job target captured" },
  { label: "Skill analysis" },
  { label: "Role level understanding" },
  { label: "Company level knowledge" },
  { label: "JD awareness" },
] as const;

const READY_STEP_REVEAL_DELAY_MS = 320;
const READY_REPORT_DELAY_MS = 600;
const REPORT_REFRESH_DELAY_MS = 2500;

type ResearchBreakdownKey =
  | "skills_research"
  | "company_clarity"
  | "jd_awareness"
  | "tools_and_role_clarity"
  | "salary_clarity";

type CareerGoal = {
  role: string | null;
  workContext: string | null;
  organizationType: string | null;
  workArrangement: string | null;
  rawText: string | null;
};

type CareerGoalValue = CareerGoal | string | null;

export type PrediagnosticsReportPreviewReport = {
  dream_job: CareerGoalValue;
  aiming_for: CareerGoalValue;
  backup: CareerGoalValue;
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
  const totalSteps = REPORT_GENERATION_STEPS.length;
  const [completedSteps, setCompletedSteps] = useState(0);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (completedSteps === totalSteps) {
      const timeoutId = window.setTimeout(() => {
        onComplete?.();
      }, READY_REPORT_DELAY_MS);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    const timeoutId = window.setTimeout(() => {
      setCompletedSteps((current) => Math.min(current + 1, totalSteps));
    }, READY_STEP_REVEAL_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [completedSteps, onComplete, ready, totalSteps]);

  const activeIndex = completedSteps < totalSteps ? completedSteps : -1;

  return (
    <main className="min-h-dvh bg-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md mx-auto space-y-10 animate-fade-in">
        <div className="text-center space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Pre-diagnostic report
          </p>
          <h1 className="text-[26px] font-semibold tracking-tight text-foreground">
            {ready ? "Your report is ready" : "Preparing your report"}
          </h1>
          <p className="mx-auto max-w-xs text-sm leading-6 text-muted-foreground">
            {ready
              ? "Opening your report now."
              : "We are analyzing your conversation. This page refreshes automatically."}
          </p>
        </div>

        <ol className="space-y-2.5">
          {REPORT_GENERATION_STEPS.map((step, index) => (
            <GenerationStepRow
              active={index === activeIndex}
              complete={index < completedSteps}
              key={step.label}
              label={step.label}
            />
          ))}
        </ol>
      </div>
    </main>
  );
}

function PrediagnosticsReportErrorState(props: {
  message: string;
  showActions: boolean;
}) {
  return (
    <main className="min-h-dvh bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md mx-auto space-y-10 text-center animate-fade-in">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Pre-diagnostic report
          </p>
          <h2 className="text-[26px] font-semibold tracking-tight text-foreground">
            Report unavailable
          </h2>
          <p className="mx-auto max-w-xs text-sm leading-6 text-muted-foreground">
            {props.message}
          </p>
        </div>

        {props.showActions ? (
          <Link
            className={buttonVariants({
              className: "w-full bg-button rounded-full h-12",
              size: "lg",
            })}
            href="/prediagnostics"
          >
            Back to start
          </Link>
        ) : null}
      </div>
    </main>
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
  const dreamJob = normalizeCareerGoal(report.dream_job);
  const targetJob = normalizeCareerGoal(report.aiming_for);
  const backupJob = normalizeCareerGoal(report.backup);

  return (
    <div className="min-h-dvh bg-lavender">
      <div className="mx-auto w-full max-w-md md:max-w-lg">
        <div className="p-5 md:p-6">
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
                  <GreenCheckBadge className="size-7" iconClassName="size-4" />
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
                  icon={<Trophy className="h-4 w-4" />}
                  iconClassName="bg-purple-100 text-purple-600"
                  title="Your dream job"
                  goal={dreamJob}
                />
                <InfoCard
                  icon={<Target className="h-4 w-4" />}
                  iconClassName="bg-amber-100 text-amber-600"
                  title="Your target (Current focus)"
                  goal={targetJob}
                />
                <InfoCard
                  icon={<Shield className="h-4 w-4" />}
                  iconClassName="bg-blue-100 text-blue-600"
                  title="Your backup"
                  goal={backupJob}
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
                  <GreenCheckBadge className="size-7" iconClassName="size-4" />
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
                    variant: "default",
                    className: "mt-6 w-full bg-button rounded-full! text-white",
                    size: "lg",
                  })}
                  href="/diagnostics"
                >
                  Start Diagnostic Interview
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
  goal: NormalizedCareerGoal;
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
            <div>{props.goal.primary}</div>
            {props.goal.secondary ? (
              <div className="mt-0.5 text-xs text-muted-foreground/80">
                {props.goal.secondary}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

type NormalizedCareerGoal = {
  primary: string;
  secondary: string | null;
};

function normalizeCareerGoal(goal: CareerGoalValue): NormalizedCareerGoal {
  if (!goal) {
    return { primary: "Not captured yet", secondary: null };
  }

  if (typeof goal === "string") {
    return { primary: goal, secondary: null };
  }

  const role = goal.role?.trim();
  const workContext = goal.workContext?.trim();
  const organizationType = goal.organizationType?.trim();
  const workArrangement = goal.workArrangement?.trim();
  const rawText = goal.rawText?.trim();

  const primary = role || rawText || "Not captured yet";
  const secondary = getCareerGoalSecondary({
    organizationType,
    workArrangement,
    workContext,
  });

  return { primary, secondary };
}

function getCareerGoalSecondary({
  organizationType,
  workArrangement,
  workContext,
}: {
  workContext?: string;
  organizationType?: string;
  workArrangement?: string;
}) {
  if (workContext) {
    return `at ${workContext}`;
  }

  if (organizationType) {
    return `in ${organizationType}`;
  }

  if (workArrangement) {
    return workArrangement;
  }

  return null;
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

function GenerationStepRow(props: {
  label: string;
  complete: boolean;
  active?: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-3.5 rounded-xl border px-4 py-3.5 transition-all duration-300",
        props.complete
          ? "border-emerald-500/25 bg-emerald-500/5"
          : props.active
            ? "border-[#5E41CF]/30 bg-[#5E41CF]/5"
            : "border-border bg-muted/40",
      )}
    >
      <span className="shrink-0">
        {props.complete ? (
          <GreenCheckBadge className="size-5" iconClassName="size-3" />
        ) : props.active ? (
          <Loader2 className="h-5 w-5 animate-spin text-[#5E41CF]" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground/35" />
        )}
      </span>
      <span
        className={cn(
          "text-sm font-medium transition-colors",
          props.complete || props.active
            ? "text-foreground"
            : "text-muted-foreground",
        )}
      >
        {props.label}
      </span>
    </li>
  );
}

function GreenCheckBadge({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-[#5DBE73] text-white",
        className,
      )}
    >
      <CheckIcon className={iconClassName} />
    </span>
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
