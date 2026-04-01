import type {
  PreScreenReport,
  PreScreenResearchBreakdown,
  PreScreenResearchCategory,
  PreScreenResearchSignal,
} from "#/diagnostic/pre-screening-types";
import { CheckCircle2, ClipboardList, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type AwarenessLevel = PreScreenReport["job_awareness_category"];
type JobPlanTone = "dream" | "aiming" | "backup";

const AWARENESS_LEVELS: AwarenessLevel[] = ["Unclear", "Clear", "Strong"];
const RESEARCH_LEVELS: PreScreenResearchCategory[] = ["Not Enough", "Good", "Strong"];

const JOB_PLAN_BUBBLES: Array<{
  key: keyof Pick<PreScreenReport, "dream_job" | "aiming_for" | "backup">;
  label: string;
  tone: JobPlanTone;
  positionClassName: string;
}> = [
  {
    key: "dream_job",
    label: "Dream",
    tone: "dream",
    positionClassName: "left-[2%] top-[49%]",
  },
  {
    key: "backup",
    label: "Backup",
    tone: "backup",
    positionClassName: "left-1/2 top-[24%] -translate-x-1/2",
  },
  {
    key: "aiming_for",
    label: "Aiming For",
    tone: "aiming",
    positionClassName: "right-[1%] top-[4%]",
  },
];

const RESEARCH_ROWS: Array<{
  key: keyof PreScreenResearchBreakdown;
  label: string;
}> = [
  { key: "skills_research", label: "Skills research" },
  { key: "tools_and_role_clarity", label: "Tools & role clarity" },
  { key: "salary_clarity", label: "Salary clarity" },
  { key: "jd_awareness", label: "JD awareness" },
  { key: "company_clarity", label: "Company clarity" },
];

function splitPlanValue(value: string | null) {
  return (
    value
      ?.split("/")
      .map((item) => item.trim())
      .filter(Boolean) ?? []
  );
}

function getAwarenessTone(level: AwarenessLevel) {
  if (level === "Strong") {
    return "strong";
  }

  if (level === "Clear") {
    return "clear";
  }

  return "unclear";
}

function getResearchTone(level?: PreScreenResearchCategory | null) {
  if (level === "Strong") {
    return "strong";
  }

  if (level === "Good") {
    return "good";
  }

  return "not-enough";
}

function getSignalTone(value: PreScreenResearchSignal) {
  if (value === "Good" || value === "Clear") {
    return "good";
  }

  if (value === "Not yet") {
    return "not-yet";
  }

  return "partial";
}

function getPrimaryTargetRole(report: PreScreenReport) {
  const aimingRoles = splitPlanValue(report.aiming_for);
  if (aimingRoles.length > 0) {
    return aimingRoles[0];
  }

  if (report.roles_mentioned.length > 0) {
    return report.roles_mentioned[0];
  }

  const dreamRoles = splitPlanValue(report.dream_job);
  if (dreamRoles.length > 0) {
    return dreamRoles[0];
  }

  return "your target";
}

function formatCompanyList(companies: string[]) {
  const cleaned = companies.map((company) => company.trim()).filter(Boolean);

  if (cleaned.length === 0) {
    return null;
  }

  if (cleaned.length === 1) {
    return cleaned[0];
  }

  if (cleaned.length === 2) {
    return `${cleaned[0]} & ${cleaned[1]}`;
  }

  return `${cleaned.slice(0, -1).join(", ")} & ${cleaned[cleaned.length - 1]}`;
}

function getDifficultyLine(level: AwarenessLevel) {
  if (level === "Strong") {
    return "Difficulty set to your advanced awareness level.";
  }

  if (level === "Clear") {
    return "Difficulty set to your current awareness level.";
  }

  return "Difficulty set to build your awareness level step by step.";
}

function getToneClasses(tone: JobPlanTone) {
  if (tone === "dream") {
    return {
      border: "border-violet-400/55",
      ring: "border-violet-400/28",
      text: "text-violet-300",
      dot: "bg-violet-400",
    };
  }

  if (tone === "aiming") {
    return {
      border: "border-amber-400/55",
      ring: "border-amber-400/28",
      text: "text-amber-300",
      dot: "bg-amber-400",
    };
  }

  return {
    border: "border-blue-400/55",
    ring: "border-blue-400/28",
    text: "text-blue-300",
    dot: "bg-blue-400",
  };
}

function getStatusPillClasses(tone: string, active: boolean) {
  if (!active) {
    return "border-slate-800 bg-slate-900/85 text-slate-500";
  }

  if (tone === "strong") {
    return "border-emerald-300/50 bg-emerald-400 text-slate-950";
  }

  if (tone === "clear" || tone === "good") {
    return "border-amber-300/50 bg-amber-400 text-slate-950";
  }

  return "border-orange-300/50 bg-orange-400 text-slate-950";
}

function getSignalClasses(value: PreScreenResearchSignal) {
  const tone = getSignalTone(value);

  if (tone === "good") {
    return "text-emerald-300";
  }

  if (tone === "not-yet") {
    return "text-orange-300";
  }

  return "text-amber-300";
}

function getSignalDotClasses(value: PreScreenResearchSignal) {
  const tone = getSignalTone(value);

  if (tone === "good") {
    return "bg-emerald-400";
  }

  if (tone === "not-yet") {
    return "bg-orange-400";
  }

  return "bg-amber-400";
}

function deriveResearchBreakdown(report: PreScreenReport): PreScreenResearchBreakdown {
  if (report.job_research_breakdown) {
    return report.job_research_breakdown;
  }

  return {
    skills_research:
      report.roles_mentioned.length > 0
        ? "Good"
        : report.reasoning?.trim()
          ? "Some gaps"
          : "Not yet",
    tools_and_role_clarity: report.reasoning?.trim() ? "Some gaps" : "Not yet",
    salary_clarity: report.salary_expectation?.trim() ? "Rough idea" : "Not yet",
    jd_awareness:
      report.job_awareness_category === "Strong"
        ? "Some gaps"
        : report.job_awareness_category === "Clear"
          ? "Rough idea"
          : "Not yet",
    company_clarity: report.companies_mentioned.length > 0 ? "Clear" : "Not yet",
  };
}

function deriveResearchCategory(breakdown: PreScreenResearchBreakdown): PreScreenResearchCategory {
  const scoreMap: Record<PreScreenResearchSignal, number> = {
    Good: 2,
    Clear: 2,
    "Some gaps": 1,
    "Rough idea": 1,
    "Not yet": 0,
  };

  const scores = Object.values(breakdown).map((signal) => scoreMap[signal]);
  const average = scores.reduce((total, current) => total + current, 0) / scores.length;

  if (average >= 1.6) {
    return "Strong";
  }

  if (average >= 0.8) {
    return "Good";
  }

  return "Not Enough";
}

function SectionHeader<T extends string>(props: {
  index: number;
  title: string;
  levels: readonly T[];
  active: T;
  tone: string;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-3 text-slate-400">
        <div className="flex size-8 items-center justify-center rounded-full border border-slate-700 text-sm font-semibold">
          {props.index}
        </div>
        <div className="whitespace-nowrap text-sm font-black uppercase tracking-[0.18em] text-slate-300">
          {props.title}
        </div>
        <Separator className="flex-1 bg-slate-800" />
      </div>

      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
        {props.levels.map((level) => {
          const active = level === props.active;
          return (
            <div
              key={level}
              className={cn(
                "shrink-0 rounded-full border px-3 py-2 text-[12px] font-semibold tracking-wide transition-colors",
                getStatusPillClasses(props.tone, active),
              )}
            >
              {level}
              {active ? " ✓" : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function JobPlanBubble(props: {
  label: string;
  value: string | null;
  tone: JobPlanTone;
  positionClassName: string;
  salary?: string | null;
}) {
  const lines = splitPlanValue(props.value);
  const toneClasses = getToneClasses(props.tone);

  return (
    <article
      className={cn(
        "absolute flex size-32 flex-col items-center justify-center rounded-full border-2 bg-slate-950/92 px-3 text-center shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur",
        toneClasses.border,
        props.positionClassName,
      )}
    >
      <div
        className={cn("mb-1 text-[12px] font-black uppercase tracking-[0.12em]", toneClasses.text)}
      >
        {props.tone === "dream" ? "★ " : ""}
        {props.label}
      </div>

      <div className="space-y-0.5">
        {lines.length > 0 ? (
          lines.map((line) => (
            <div
              key={`${props.label}-${line}`}
              className="text-[13px] font-semibold leading-tight text-slate-100"
            >
              {line}
            </div>
          ))
        ) : (
          <div className="text-[13px] leading-tight text-slate-400">Not mentioned</div>
        )}
      </div>

      {props.salary ? (
        <div className={cn("mt-2 text-[12px] font-bold", toneClasses.text)}>{props.salary}</div>
      ) : null}
    </article>
  );
}

function ReadyToScheduleCard(props: { report: PreScreenReport }) {
  const role = getPrimaryTargetRole(props.report);
  const companies = formatCompanyList(props.report.companies_mentioned);
  const difficultyLine = getDifficultyLine(props.report.job_awareness_category);

  return (
    <Card className="overflow-hidden mt-2 rounded-[28px] border border-blue-400/30 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.2),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))]">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-lg">
            📋
          </div>

          <div className="space-y-2">
            <h3 className="text-[14px] leading-6 font-semibold text-blue-300">
              Your Diagnostic Interview is ready to schedule
            </h3>

            <p className="text-[13px] leading-6 text-slate-300">
              Interview questions built around{" "}
              <span className="font-semibold text-slate-100">{role}</span> roles
              {companies ? (
                <>
                  {" "}
                  at <span className="font-semibold text-slate-100">{companies}</span>.
                </>
              ) : (
                "."
              )}{" "}
              {difficultyLine}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportReadyView(props: { report: PreScreenReport; onReset: () => void }) {
  const awarenessTone = getAwarenessTone(props.report.job_awareness_category);
  const researchBreakdown = deriveResearchBreakdown(props.report);
  const researchCategory =
    props.report.job_research_category ?? deriveResearchCategory(researchBreakdown);
  const researchTone = getResearchTone(researchCategory);

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <section className="space-y-4">
          <SectionHeader
            index={1}
            title="Job Plans"
            levels={AWARENESS_LEVELS}
            active={props.report.job_awareness_category}
            tone={awarenessTone}
          />

          <div className="rounded-[32px] border border-slate-800 bg-slate-950/75 px-4 py-5">
            <div className="relative mx-auto h-[360px] max-w-[740px] overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,rgba(15,23,42,0.28),rgba(2,6,23,0.08))]">
              <div className="absolute left-1/2 top-1/2 h-[260px] w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-violet-400/20" />
              <div className="absolute left-1/2 top-1/2 h-[190px] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-amber-400/20" />
              <div className="absolute left-1/2 top-1/2 h-[120px] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-blue-400/25" />

              {JOB_PLAN_BUBBLES.map((bubble) => (
                <JobPlanBubble
                  key={bubble.key}
                  label={bubble.label}
                  tone={bubble.tone}
                  value={props.report[bubble.key]}
                  positionClassName={bubble.positionClassName}
                  salary={bubble.key === "aiming_for" ? props.report.salary_expectation : null}
                />
              ))}
            </div>

            <div className="mt-4 flex items-center justify-center gap-5 text-[12px] text-slate-400">
              {(["backup", "aiming", "dream"] as const).map((tone) => {
                const toneClasses = getToneClasses(tone);
                const label =
                  tone === "aiming" ? "Aiming For" : tone === "dream" ? "Dream" : "Backup";
                return (
                  <div key={tone} className="flex items-center gap-2">
                    <span className={cn("size-3 rounded-full", toneClasses.dot)} />
                    <span>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeader
            index={2}
            title="Job Research"
            levels={RESEARCH_LEVELS}
            active={researchCategory}
            tone={researchTone}
          />

          <Card className="overflow-hidden rounded-[30px] border-slate-800 bg-slate-950/78">
            <CardContent className="p-0">
              {RESEARCH_ROWS.map((row, index) => {
                const value = researchBreakdown[row.key];
                return (
                  <div key={row.key}>
                    {index > 0 ? <Separator className="bg-slate-800" /> : null}
                    <div className="flex items-center justify-between gap-4 px-5 py-4">
                      <div className="text-[13px] text-slate-300">{row.label}</div>
                      <div
                        className={cn(
                          "flex items-center gap-2 text-[13px] font-semibold",
                          getSignalClasses(value),
                        )}
                      >
                        <span className={cn("size-3 rounded-full", getSignalDotClasses(value))} />
                        {value}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="flex gap-5 px-2 text-[12px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-emerald-400" />
              Good
            </div>
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-amber-400" />
              Partial
            </div>
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-orange-400" />
              Not yet
            </div>
          </div>
        </section>
        <ReadyToScheduleCard report={props.report} />

        {/* <Card className="rounded-[28px] border-orange-400/30 bg-slate-950/78">
          <CardHeader className="pb-3">
            <CardTitle className="text-[14px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[13px] leading-6 text-slate-100">
              {getSummaryCopy(props.report.job_awareness_category)}
            </p>
          </CardContent>
        </Card> */}
      </div>
    </div>
  );
}

function WaitingReportView() {
  return (
    <Card className="overflow-hidden rounded-[28px] border border-sky-400/25 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.18),transparent_32%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))]">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="relative mt-1 flex size-20 shrink-0 items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-slate-600/70" />
            <div className="absolute inset-1 rounded-full border border-slate-700/90 bg-slate-950/70" />
            <div className="absolute inset-0 rounded-full border-4 border-sky-400/80 border-r-transparent border-b-transparent animate-spin [animation-duration:2.4s]" />
            <div className="absolute inset-[8px] rounded-full border-4 border-amber-400/90 border-l-transparent border-t-transparent animate-spin [animation-direction:reverse] [animation-duration:1.6s]" />
            <div className="relative z-10 flex size-9 items-center justify-center rounded-full border border-slate-700 bg-slate-950 text-amber-200">
              <ClipboardList className="size-4" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-[14px] leading-6 font-semibold text-slate-100">
              Building your Diagnostic Interview...
            </h3>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 text-[13px] leading-6 text-slate-300">
                <CheckCircle2 className="size-5 text-emerald-400" />
                <span>Job targets captured</span>
              </div>
              <div className="flex items-center gap-2.5 text-[13px] leading-6 text-slate-300">
                <CheckCircle2 className="size-5 text-emerald-400" />
                <span>Research depth assessed</span>
              </div>
              <div className="flex items-center gap-2.5 text-[14px] leading-6 text-sky-300">
                <LoaderCircle className="size-5 animate-spin" />
                <span className="font-semibold">Personalising interview questions...</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PreScreenReportPanel(props: {
  status: "waiting" | "ready" | "failed";
  report: PreScreenReport | null;
  errorMessage?: string | null;
  canRetry?: boolean;
  isRetrying?: boolean;
  onRetry?: () => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-5">
      {props.status === "ready" && props.report ? (
        <ReportReadyView report={props.report} onReset={props.onReset} />
      ) : props.status === "waiting" ? (
        <WaitingReportView />
      ) : (
        <Card className="rounded-[28px] border-slate-800 bg-slate-950/85">
          <CardHeader>
            <CardTitle className="text-[14px] text-slate-50">Summary unavailable</CardTitle>
            <CardDescription className="text-[13px] leading-6 text-slate-400">
              {props.errorMessage || "We could not prepare the summary for this session."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {props.canRetry && props.onRetry ? (
              <Button disabled={props.isRetrying} onClick={props.onRetry}>
                {props.isRetrying ? "Retrying..." : "Retry summary"}
              </Button>
            ) : null}
            <Button variant="outline" onClick={props.onReset}>
              Back to pre-screening
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
