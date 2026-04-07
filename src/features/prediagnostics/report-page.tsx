import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BriefcaseBusiness, LoaderCircle, Shield, Target } from "lucide-react";
import { IconCircleCheckFilled } from "@tabler/icons-react";

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

const GENERATION_DELAY_MS = 3000;

export function PrediagnosticsReportPage(props: { preferredName?: string | null }) {
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsGenerating(false);
    }, GENERATION_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  if (isGenerating) {
    return <PrediagnosticsReportGeneratingState />;
  }

  return <PrediagnosticsReportPreview preferredName={props.preferredName} report={MOCK_REPORT} />;
}

function PrediagnosticsReportGeneratingState() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#F5F3F7] px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-[0_20px_40px_rgba(112,88,186,0.12)]">
        <div className="mx-auto flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#5a42cc]/10">
            <LoaderCircle className="h-8 w-8 animate-spin text-[#5a42cc]" />
          </div>

          <h1 className="text-xl font-semibold text-[#2b2233]">Generating your report</h1>

          <p className="text-sm leading-6 text-[#7f768f]">
            We&apos;re summarizing your job goal and awareness from the session.
          </p>

          <div className="mt-4 w-full space-y-3">
            <div className="h-2.5 overflow-hidden rounded-full bg-[#e5e0ed]">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-[linear-gradient(90deg,#4F33A3_0%,#6A4DF5_100%)]" />
            </div>
            <div className="h-2.5 w-3/4 rounded-full bg-[#e5e0ed]" />
            <div className="h-2.5 w-1/2 rounded-full bg-[#e5e0ed]" />
          </div>
        </div>
      </div>
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
