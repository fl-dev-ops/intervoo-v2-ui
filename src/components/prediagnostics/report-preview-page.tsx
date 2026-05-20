"use client";

import {
  IconCheck,
  IconCircle,
  IconLoader2,
  IconRotate,
} from "@tabler/icons-react";
import confetti from "canvas-confetti";
import { Shield, Target, Trophy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { createPrediagnosticRetryCode } from "@/lib/prediagnostics/retry-code";
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

type AwarenessReportRow = {
  key: ResearchBreakdownKey;
  label: string;
  value: string;
};

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
    const end = Date.now() + 3000;
    const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];
    let animationFrame = 0;

    const frame = () => {
      if (Date.now() > end) return;

      void confetti({
        angle: 60,
        colors,
        origin: { x: 0, y: 0.5 },
        particleCount: 2,
        spread: 55,
        startVelocity: 60,
      });
      void confetti({
        angle: 120,
        colors,
        origin: { x: 1, y: 0.5 },
        particleCount: 2,
        spread: 55,
        startVelocity: 60,
      });

      animationFrame = requestAnimationFrame(frame);
    };

    frame();

    return () => cancelAnimationFrame(animationFrame);
  }, []);

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
    <main className="flex min-h-dvh items-center justify-center bg-[#F5F3F7] px-6 py-12">
      <div className="mx-auto w-full max-w-md animate-fade-in space-y-12">
        <div className="text-center">
          <div className="relative mx-auto h-52 w-52">
            <Image
              alt="Round completed"
              className="object-contain"
              fill
              sizes="208px"
              src="/round-completed.svg"
            />
            <div className="absolute bottom-6 left-2 grid size-18 place-items-center rounded-full bg-[#58ad6f] text-white shadow-[0_10px_30px_rgba(88,173,111,0.35)]">
              <IconCheck className="size-9" />
            </div>
          </div>

          <h1 className="text-[28px] font-semibold tracking-tight text-foreground mb-2">
            Congratulations!
          </h1>
          <p className="text-base mx-auto max-w-xs leading-6 text-foreground">
            Getting your job awareness report.
          </p>
        </div>

        <ol className="mx-auto max-w-60 space-y-5">
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
  const awarenessRows = getAwarenessRows(report);
  const clearAwarenessRows = awarenessRows.filter((row) =>
    isClearAwarenessValue(row.value),
  );
  const improvementAwarenessRows = awarenessRows.filter(
    (row) => !isClearAwarenessValue(row.value),
  );

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
              <div className="flex items-center justify-between gap-3 pb-3 border-b">
                <div className="flex items-center gap-3 ">
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

              <div className="mt-4 space-y-1">
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

              {clearAwarenessRows.length > 0 ? (
                <AwarenessGroup
                  rows={clearAwarenessRows}
                  title="You are clear about"
                />
              ) : null}

              {improvementAwarenessRows.length > 0 ? (
                <AwarenessGroup
                  rows={improvementAwarenessRows}
                  title="Need improvement"
                />
              ) : null}

              {improvementAwarenessRows.length > 0 ? (
                <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm leading-6 text-amber-700 dark:text-amber-300">
                  Some key areas are not clear yet. Improving them will help you
                  perform better in interviews.
                </div>
              ) : (
                <div className="mt-4 rounded-xl bg-indigo-500/10 px-4 py-3 text-center text-sm leading-6 text-foreground">
                  🔥 You’re clear about your job role and salary range. Good to
                  go
                </div>
              )}
            </section>

            {showActions ? (
              <>
                <RetakePreScreeningSection />

                <section className="mt-8 rounded-xl px-5 text-center">
                  <h2 className="text-[1.35rem] font-semibold tracking-[-0.02em] text-foreground">
                    Diagnostic interview ready
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Choose the job band you want to practice for and start a
                    full video diagnostic interview.
                  </p>
                  <a
                    className={buttonVariants({
                      className:
                        "h-12 mt-6 w-full bg-button rounded-full! text-white",
                      size: "lg",
                      variant: "default",
                    })}
                    href="/diagnostics"
                  >
                    Start Diagnostic Interview
                  </a>
                </section>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function RetakePreScreeningSection() {
  const [retryCode, setRetryCode] = useState<string | null>(null);

  useEffect(() => {
    setRetryCode(createPrediagnosticRetryCode());
  }, []);

  return (
    <section className="rounded-xl border-2 border-dashed border-[#C8B9D6] bg-[#F5F0FA] px-4 py-5 text-center">
      <h2 className="text-base font-semibold text-foreground">
        Want to update your inputs?
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        You can refine your goals and awareness to get a more personalized
        interview.
      </p>
      <Link
        className="mt-4 inline-flex items-center justify-center gap-2 text-sm font-semibold text-[#6548E4] transition-colors hover:text-[#4D35B8]"
        href={
          retryCode ? `/prediagnostics?code=${retryCode}` : "/prediagnostics"
        }
      >
        <IconRotate className="size-5 text-black" stroke={2.25} />
        Retake Pre Screening
      </Link>
    </section>
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
    <div className="rounded-xl bg-card py-3">
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

function AwarenessRow(props: { label: string; value: string }) {
  const normalizedValue = props.value.trim().toLowerCase();
  const valueClassName =
    normalizedValue === "not yet"
      ? "text-red-500"
      : isClearAwarenessValue(props.value)
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-amber-600 dark:text-amber-400";

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

function AwarenessGroup({
  rows,
  title,
}: {
  rows: AwarenessReportRow[];
  title: string;
}) {
  return (
    <div className="mt-4 grid gap-1 text-sm leading-7 text-muted-foreground">
      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.06em] text-foreground">
        {title}
      </div>
      {rows.map((row) => (
        <AwarenessRow key={row.key} label={row.label} value={row.value} />
      ))}
    </div>
  );
}

function getAwarenessRows(
  report: PrediagnosticsReportPreviewReport,
): AwarenessReportRow[] {
  return [
    {
      key: "skills_research",
      label: "Skills research",
      value: getReportBreakdownValue(report, "skills_research"),
    },
    {
      key: "company_clarity",
      label: "Company knowledge",
      value: getReportBreakdownValue(report, "company_clarity"),
    },
    {
      key: "jd_awareness",
      label: "JD awareness",
      value: getReportBreakdownValue(report, "jd_awareness"),
    },
    {
      key: "tools_and_role_clarity",
      label: "Role clarity",
      value: getReportBreakdownValue(report, "tools_and_role_clarity"),
    },
    {
      key: "salary_clarity",
      label: "Salary understanding",
      value: getReportBreakdownValue(report, "salary_clarity"),
    },
  ];
}

function isClearAwarenessValue(value: string) {
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "clear" || normalized === "good" || normalized === "strong"
  );
}

function GenerationStepRow(props: {
  label: string;
  complete: boolean;
  active?: boolean;
}) {
  return (
    <li className="flex items-center gap-4 transition-all duration-300">
      <span className="shrink-0">
        {props.complete ? (
          <GreenCheckBadge className="size-6" iconClassName="size-4" />
        ) : props.active ? (
          <IconLoader2 className="size-6 animate-spin text-[#6548E4]" />
        ) : (
          <IconCircle className="size-6 text-[#D8CDDE]" stroke={1.75} />
        )}
      </span>
      <span className="text-sm font-medium text-foreground transition-colors">
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
      <IconCheck className={iconClassName} stroke={3} />
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
