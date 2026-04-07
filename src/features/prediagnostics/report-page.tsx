import { useEffect, useMemo, useState, type ReactNode } from "react";
import confetti from "@hiseb/confetti";
import { BriefcaseBusiness, Shield, Target } from "lucide-react";
import { IconCircle, IconCircleCheckFilled } from "@tabler/icons-react";

type JobResearchBreakdown = {
  jd_awareness: string;
  salary_clarity: string;
  company_clarity: string;
  skills_research: string;
  tools_and_role_clarity: string;
};

type PrediagnosticsReport = {
  backup: string | null;
  dream_job: string | null;
  reasoning: string | null;
  aiming_for: string | null;
  roles_mentioned: string[];
  salary_expectation: string | null;
  companies_mentioned: string[];
  job_research_category: string;
  job_awareness_category: string;
  job_research_breakdown: JobResearchBreakdown;
};

const MOCK_REPORT: PrediagnosticsReport = {
  backup: "any sort of role",
  dream_job: "Data Science Manager or Leader in a Product company",
  reasoning: "I like to analyze a lot of data and get insights through statistical analysis.",
  aiming_for: "Junior Data Scientist Role",
  roles_mentioned: ["Data Science", "Junior Data Scientist", "Data Science Manager", "Leader"],
  salary_expectation: null,
  companies_mentioned: [],
  job_research_category: "Good",
  job_awareness_category: "Strong",
  job_research_breakdown: {
    jd_awareness: "Some gaps",
    salary_clarity: "Not yet",
    company_clarity: "Rough idea",
    skills_research: "Good",
    tools_and_role_clarity: "Some gaps",
  },
};

const REPORT_GENERATION_STEPS = [
  { label: "Job target captured" },
  { label: "Skill analysis" },
  { label: "Role level understanding" },
  { label: "Company level knowledge" },
  { label: "JD awareness" },
] as const;
const STEP_REVEAL_DELAY_MS = 1000;
const REPORT_READY_DELAY_MS = 2000;

export function PrediagnosticsReportPage(props: { preferredName?: string | null }) {
  const [isGenerating, setIsGenerating] = useState(true);
  const [completedSteps, setCompletedSteps] = useState(0);
  const hasCompletedAllSteps = completedSteps === REPORT_GENERATION_STEPS.length;

  useEffect(() => {
    if (hasCompletedAllSteps) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCompletedSteps((current) => Math.min(current + 1, REPORT_GENERATION_STEPS.length));
    }, STEP_REVEAL_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [completedSteps, hasCompletedAllSteps]);

  useEffect(() => {
    if (!hasCompletedAllSteps) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsGenerating(false);
    }, REPORT_READY_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hasCompletedAllSteps]);

  if (isGenerating) {
    return (
      <PrediagnosticsReportGeneratingState
        completedSteps={completedSteps}
        shouldCelebrate={hasCompletedAllSteps}
      />
    );
  }

  return <PrediagnosticsReportPreview preferredName={props.preferredName} report={MOCK_REPORT} />;
}

function PrediagnosticsReportGeneratingState(props: {
  completedSteps: number;
  shouldCelebrate: boolean;
}) {
  useEffect(() => {
    if (!props.shouldCelebrate) {
      return;
    }

    const xPositions = [0.18, 0.35, 0.5, 0.65, 0.82];

    xPositions.forEach((x) => {
      confetti({
        position: { x: window.innerWidth * x, y: 0 },
        count: 30,
        size: 1.1,
        velocity: 180,
        fade: false,
      });
    });
  }, [props.shouldCelebrate]);

  return (
    <section className="relative min-h-screen overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(106,77,245,0.12),transparent_65%)]" />

      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-between px-6 py-10 text-center">
        <div className="w-full" />

        <div className="flex w-full flex-1 flex-col items-center">
          <img alt="Intervoo infinity mark" className="h-40 w-40" src="/infinity.svg" />

          <h1 className="mt-8 text-3xl leading-none font-semibold text-[#16111d]">
            Congratulations!
          </h1>

          <p className="mt-3 text-lg leading-7 text-[#6f667d]">
            Getting your pre-diagnostics report.
          </p>

          <div className="mt-12 w-full max-w-65 space-y-6 text-left">
            {REPORT_GENERATION_STEPS.map((step, index) => (
              <GenerationStepRow
                key={step.label}
                complete={index < props.completedSteps}
                label={step.label}
              />
            ))}
          </div>
        </div>

        <p className="pb-2 text-mauve-500">This may take a few seconds...</p>
      </div>
    </section>
  );
}

function GenerationStepRow(props: { label: string; complete: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <span
        className={
          props.complete
            ? "flex shrink-0 items-center justify-center rounded-full bg-[#7ad487] text-white"
            : "shrink-0"
        }
      >
        {props.complete ? (
          <IconCircleCheckFilled className="h-7 w-7 text-green-600 bg-white" />
        ) : (
          <IconCircle className="h-7 w-7 text-gray-300 bg-white" />
        )}
      </span>
      <span className=" text-[#16111d]">{props.label}</span>
    </div>
  );
}

function PrediagnosticsReportPreview({
  preferredName,
  report,
}: {
  preferredName?: string | null;
  report: PrediagnosticsReport;
}) {
  const displayName = preferredName?.trim() || "there";
  const jobGoalBadge = useMemo(
    () => getPositiveBadge(report.job_awareness_category),
    [report.job_awareness_category],
  );
  const awarenessBadge = useMemo(
    () => getPositiveBadge(report.job_research_category),
    [report.job_research_category],
  );

  return (
    <div className="min-h-screen bg-[#F5F3F7]">
      <div className="mx-auto w-full max-w-md">
        {/*<button
          className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#2b2233] shadow-[0_8px_24px_rgba(112,88,186,0.12)] transition hover:bg-[#f8f5fc]"
          type="button"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>*/}

        <div className="p-5 sm:p-6">
          <div className="rounded-xl px-5 pt-4 text-center">
            <p className="text-2xl font-medium ">
              Hi {displayName} <span aria-hidden="true">👋</span>
            </p>
            <h1 className="mt-1">Here is your pre-diagnostics report</h1>
          </div>

          <div className="mt-5 space-y-4">
            <section className="rounded-xl bg-white p-4">
              <div className="flex items-center justify-between gap-3 border-b border-[#eee8f5] pb-3">
                <div className="flex items-center gap-3">
                  <IconCircleCheckFilled className="h-7 w-7 text-[#30b961]" />
                  <div className="text-base font-semibold text-[#2b2233]">Your job goal</div>
                </div>
                <Badge color={jobGoalBadge.color} label={jobGoalBadge.label} />
              </div>

              <div className="mt-4 space-y-2.5">
                <InfoCard
                  icon={<BriefcaseBusiness className="h-4 w-4" />}
                  iconClassName="bg-[#efe5ff] text-[#7c4dff]"
                  title="Your dream job"
                  value={report.dream_job || "Not captured yet"}
                />
                <InfoCard
                  icon={<Target className="h-4 w-4" />}
                  iconClassName="bg-[#fff4dc] text-[#d89a00]"
                  title="Your target (Current focus)"
                  value={report.aiming_for || "Not captured yet"}
                />
                <InfoCard
                  icon={<Shield className="h-4 w-4" />}
                  iconClassName="bg-[#edf0ff] text-[#6b7cff]"
                  title="Your backup"
                  value={report.backup || "Not captured yet"}
                />
              </div>

              {report.reasoning ? (
                <div className="mt-2.5 rounded-xl border border-[#f3e9b0] bg-[#fffbe8] px-4 py-3 text-sm leading-6 text-[#5e5531]">
                  <span className="font-semibold">Why this goal fits you:</span> {report.reasoning}
                </div>
              ) : null}
            </section>

            <section className="rounded-xl bg-white p-4">
              <div className="flex items-center justify-between gap-3 border-b border-[#eee8f5] pb-3">
                <div className="flex items-center gap-3">
                  <IconCircleCheckFilled className="h-7 w-7 text-[#30b961]" />
                  <div className="text-base font-semibold">Your job awareness</div>
                </div>
                <Badge color={awarenessBadge.color} label={awarenessBadge.label} />
              </div>

              <div className="mt-4 grid gap-1 text-sm leading-7 text-[#6f667d]">
                <div className="mb-1 text-xs font-semibold tracking-[0.06em] text-[#2b2233] uppercase">
                  You are clear about
                </div>
                <AwarenessRow
                  label="Skills research"
                  value={report.job_research_breakdown.skills_research}
                  positive
                />
                <AwarenessRow
                  label="Company knowledge"
                  value={report.job_research_breakdown.company_clarity}
                />
              </div>

              <div className="mt-4 grid gap-1 text-sm leading-7 text-[#6f667d]">
                <div className="mb-1 text-xs font-semibold tracking-[0.06em] text-[#2b2233] uppercase">
                  Need improvement
                </div>
                <AwarenessRow
                  label="JD awareness"
                  value={report.job_research_breakdown.jd_awareness}
                  warning
                />
                <AwarenessRow
                  label="Role clarity"
                  value={report.job_research_breakdown.tools_and_role_clarity}
                  warning
                />
                <AwarenessRow
                  label="Salary understanding"
                  value={report.job_research_breakdown.salary_clarity}
                  warning
                />
              </div>

              <div className="mt-4 rounded-xl border border-[#f3e9b0] bg-[#fffbe8] px-4 py-3 text-sm leading-6 text-[#5e5531]">
                Some key areas are not clear yet. Improving them will help you perform better in
                interviews.
              </div>
            </section>

            <section className="rounded-xl my-12 px-5 text-center">
              <h2 className="text-[1.35rem] font-semibold tracking-[-0.02em] text-[#2b2233]">
                Diagnostic interview coming soon
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#6f667d]">
                We&apos;re preparing the next step. Your report is ready, and the full diagnostic
                interview experience will be available soon.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge(props: { label: string; color: "green" | "amber" }) {
  const className =
    props.color === "green"
      ? "border border-[#30b961] bg-[#f2fff6] text-[#30b961]"
      : "border border-[#f5a623] bg-[#fff8ee] text-[#f5a623]";

  return (
    <div className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{props.label}</div>
  );
}

function InfoCard(props: { icon: ReactNode; iconClassName: string; title: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#ece7f2] p-3">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full ${props.iconClassName}`}
        >
          {props.icon}
        </div>
        <div>
          <div className="text-sm font-semibold text-[#2b2233]">{props.title}</div>
          <div className="mt-1 text-sm text-[#6f667d]">{props.value}</div>
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
      ? "text-[#e5484d]"
      : props.positive
        ? "text-[#30b961]"
        : props.warning
          ? "text-[#f5a623]"
          : "text-[#30b961]";

  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <div className="flex items-center gap-2 text-[#7a7188]">
        <span>{props.label}</span>
      </div>
      <span className={`text-right font-medium ${valueClassName}`}>{props.value}</span>
    </div>
  );
}

function getPositiveBadge(value: string) {
  const normalized = value.trim().toLowerCase();

  if (normalized === "strong" || normalized === "good" || normalized === "clear") {
    return { label: value, color: "green" as const };
  }

  return { label: value, color: "amber" as const };
}
