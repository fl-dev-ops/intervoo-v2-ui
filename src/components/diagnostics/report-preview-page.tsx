import {
  Award,
  BarChart3,
  BriefcaseBusiness,
  CheckIcon,
  ExternalLink,
  Gauge,
  Languages,
  Target,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import type { DerivedFinalDiagnosticReport } from "@/lib/diagnostics/final-report";
import { DIAGNOSTIC_ROUNDS } from "@/lib/diagnostics/rounds-config";

export type FinalDiagnosticReport = DerivedFinalDiagnosticReport;

export type DiagnosticReportPageState = {
  preferredName?: string | null;
} & (
  | {
      status: "final-ready";
      report: FinalDiagnosticReport;
      errorMessage?: null;
    }
  | {
      status: "pending" | "processing" | "failed" | "unavailable";
      errorMessage?: string | null;
      report?: null;
    }
);

export function DiagnosticReportPreviewPage({
  publicUrl,
  showActions = false,
  state,
}: {
  publicUrl?: string | null;
  showActions?: boolean;
  state: DiagnosticReportPageState;
}) {
  if (state.status === "final-ready") {
    return (
      <FinalDiagnosticReportPreview
        preferredName={state.preferredName}
        publicUrl={publicUrl}
        report={state.report}
        showActions={showActions}
      />
    );
  }

  return (
    <DiagnosticReportErrorState
      message={state.errorMessage ?? "Failed to load report."}
      showActions={showActions}
    />
  );
}

function FinalDiagnosticReportPreview({
  preferredName,
  publicUrl,
  report,
  showActions,
}: {
  preferredName?: string | null;
  publicUrl?: string | null;
  report: FinalDiagnosticReport;
  showActions: boolean;
}) {
  const displayName = preferredName?.trim() || "there";

  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
        <HeaderActions publicUrl={publicUrl} showActions={showActions} />

        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-lg">
          <div className="bg-gradient-to-br from-primary/15 via-transparent to-emerald-500/10 p-5 sm:p-8">
            <p className="text-sm font-medium uppercase tracking-[0.08em] text-primary">
              Final diagnostic report
            </p>
            <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_16rem] lg:items-center">
              <div>
                <h1 className="text-2xl font-semibold tracking-[-0.02em] text-foreground sm:text-4xl">
                  Hi {displayName}, here is your full interview readiness report
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  A holistic synthesis across all four diagnostic rounds,
                  including thinking, language, confidence, and salary
                  readiness.
                </p>
              </div>
              <div className="rounded-3xl border border-border bg-card p-5 text-center shadow-sm">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Overall score
                </p>
                <p className="mt-2 text-5xl font-semibold text-foreground">
                  {Math.round(report.overall_score)}
                </p>
                <p className="text-sm text-muted-foreground">out of 100</p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-8">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <MetricCard
                icon={<Gauge className="h-4 w-4" />}
                label="Thinking"
                value={formatNumber(report.thinking_avg)}
              />
              <MetricCard
                icon={<Languages className="h-4 w-4" />}
                label="Language"
                value={formatNumber(report.language_avg)}
              />
              <MetricCard
                icon={<TrendingUp className="h-4 w-4" />}
                label="Confidence"
                value={formatNumber(report.confidence_avg)}
              />
              <MetricCard
                icon={<Award className="h-4 w-4" />}
                label="Salary"
                value={`${formatNumber(report.salary_lpa)} LPA`}
              />
              <MetricCard
                icon={<BarChart3 className="h-4 w-4" />}
                label="Percentile"
                value={`${Math.round(report.salary_percentile)}%`}
              />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <InsightList
                items={report.holistic_strengths}
                tone="positive"
                title="Holistic strengths"
              />
              <InsightList
                items={report.holistic_improvements}
                tone="warning"
                title="Growth priorities"
              />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <StatementCard
                icon={<BriefcaseBusiness className="h-4 w-4" />}
                title="Education summary"
                value={report.education_summary}
              />
              <StatementCard
                icon={<Target className="h-4 w-4" />}
                title="Aspiration"
                value={report.aspiration_statement}
              />
              <StatementCard
                icon={<BarChart3 className="h-4 w-4" />}
                title="Reality check"
                value={report.reality_statement}
              />
            </div>

            <section className="mt-6 rounded-2xl border border-border bg-background p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground">
                  Round summaries
                </h2>
                <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                  {report.salary_band}
                </span>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {report.round_summaries.map((round) => (
                  <div
                    className="rounded-2xl border border-border bg-card p-4"
                    key={round.roundId}
                  >
                    <h3 className="font-semibold text-foreground">
                      {getRoundTitle(round.roundId)}
                    </h3>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                      <MiniMetric
                        label="Thinking"
                        value={round.thinking_level}
                      />
                      <MiniMetric
                        label="Confidence"
                        value={round.confidence_level}
                      />
                      <MiniMetric
                        label="Language"
                        value={formatNumber(round.language_avg)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function DiagnosticReportErrorState({
  message,
  showActions,
}: {
  message: string;
  showActions: boolean;
}) {
  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 text-center shadow-lg">
        <h2 className="text-xl font-semibold text-foreground">
          Report unavailable
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {message}
        </p>
        {showActions ? (
          <Link
            className={buttonVariants({ className: "mt-6 w-full", size: "lg" })}
            href="/diagnostics/rounds"
          >
            Back to rounds
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function HeaderActions({
  publicUrl,
  showActions,
}: {
  publicUrl?: string | null;
  showActions: boolean;
}) {
  if (!showActions) {
    return null;
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <Link
        className={buttonVariants({ size: "sm", variant: "outline" })}
        href="/diagnostics/rounds"
      >
        Back to rounds
      </Link>
      {publicUrl ? (
        <a
          className={buttonVariants({ size: "sm", variant: "ghost" })}
          href={publicUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Public link
        </a>
      ) : null}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted p-2">
      <p className="text-[0.7rem] text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold text-foreground">{value}</p>
    </div>
  );
}

function InsightList({
  items,
  title,
  tone,
}: {
  items: string[];
  title: string;
  tone: "positive" | "warning";
}) {
  const iconClassName =
    tone === "positive" ? "bg-[#5DBE73] text-white" : "bg-amber-500 text-white";

  return (
    <section className="rounded-2xl border border-border bg-background p-4">
      <h2 className="font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div className="flex gap-3 text-sm leading-6" key={item}>
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${iconClassName}`}
            >
              <CheckIcon className="h-3.5 w-3.5" />
            </span>
            <span className="text-muted-foreground">{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatementCard({
  icon,
  title,
  value,
}: {
  icon: ReactNode;
  title: string;
  value: string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center gap-2 font-semibold text-foreground">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </span>
        {title}
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{value}</p>
    </section>
  );
}

function getRoundTitle(roundType?: string | null) {
  if (!roundType) {
    return "diagnostic round";
  }

  const match = DIAGNOSTIC_ROUNDS.find((round) => round.id === roundType);
  return match?.title ?? roundType;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
