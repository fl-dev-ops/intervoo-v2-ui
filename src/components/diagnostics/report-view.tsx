"use client";

import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Languages,
  Lightbulb,
  Smile,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import type { DiagnosticJobOption } from "@/lib/diagnostics/job-options";
import type { DiagnosticsHydratedReport } from "@/lib/diagnostics/report-schema";

export type ReportViewProps = {
  report: DiagnosticsHydratedReport;
  options: DiagnosticJobOption[];
  band: string;
};

export function ReportView(props: ReportViewProps) {
  const selectedOption = props.options.find((o) => o.id === props.band);
  const assessment = props.report.assessment_result;
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    language: false,
    thinking: false,
    confidence: false,
  });

  const score = Math.round(assessment.total_score);
  const isReady = assessment.total_score >= 80;

  type SectionTone = "green" | "red" | "amber" | "purple";

  const getSectionTone = (avg: number): SectionTone => {
    if (avg >= 80) return "green";
    if (avg >= 50) return "amber";
    return "red";
  };

  const DETAIL_SECTIONS: Array<{
    key: string;
    title: string;
    level: string;
    tone: SectionTone;
    icon: ReactNode;
    summary: string;
    items: Array<{
      title: string;
      body: string;
      tag: string;
      tone: SectionTone;
    }>;
  }> = [
    {
      key: "language",
      title: "Language proficiency",
      level:
        assessment.language_avg >= 80
          ? "HIGH"
          : assessment.language_avg >= 50
            ? "MID"
            : "LOW",
      tone: getSectionTone(assessment.language_avg),
      icon: <Languages className="h-5 w-5" />,
      summary: assessment.language_reasoning
        ? Object.values(assessment.language_reasoning).join(" ")
        : "Language evaluation complete.",
      items: [
        {
          title: "Fluency",
          body: assessment.language_reasoning.Fluency ?? "N/A",
          tag: assessment.language_levels.Fluency ?? "N/A",
          tone: getLevelTone(assessment.language_levels.Fluency),
        },
        {
          title: "Grammar",
          body: assessment.language_reasoning.Grammar ?? "N/A",
          tag: assessment.language_levels.Grammar ?? "N/A",
          tone: getLevelTone(assessment.language_levels.Grammar),
        },
        {
          title: "Coherence",
          body: assessment.language_reasoning.Coherence ?? "N/A",
          tag: assessment.language_levels.Coherence ?? "N/A",
          tone: getLevelTone(assessment.language_levels.Coherence),
        },
      ],
    },
    {
      key: "thinking",
      title: "Thinking",
      level:
        assessment.thinking_avg >= 80
          ? "HIGH"
          : assessment.thinking_avg >= 50
            ? "MID"
            : "LOW",
      tone: getSectionTone(assessment.thinking_avg),
      icon: <Lightbulb className="h-5 w-5" />,
      summary: assessment.thinking_reasoning,
      items: [
        {
          title: "Thinking Level",
          body: assessment.thinking_reasoning,
          tag: assessment.thinking_level,
          tone: getThinkingTone(assessment.thinking_level),
        },
      ],
    },
    {
      key: "confidence",
      title: "Confidence",
      level:
        assessment.confidence_avg >= 80
          ? "HIGH"
          : assessment.confidence_avg >= 50
            ? "MID"
            : "LOW",
      tone: getSectionTone(assessment.confidence_avg),
      icon: <Smile className="h-5 w-5" />,
      summary: assessment.confidence_reasoning,
      items: [
        {
          title: "Confidence Level",
          body: assessment.confidence_reasoning,
          tag: assessment.confidence_level,
          tone: getConfidenceTone(assessment.confidence_level),
        },
      ],
    },
  ];

  return (
    <>
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm md:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Interview readiness score
        </h2>

        <div className="mt-5 rounded-xl border border-border bg-input/30 p-4">
          <div className="grid gap-4 md:grid-cols-[1fr_13rem]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                  {selectedOption?.title ?? "Selected job"}
                </h3>
                <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">
                  {selectedOption?.salary ?? "₹10-20 LPA"}
                </span>
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                {selectedOption?.description}
              </p>
              <div className="mt-4 inline-flex max-w-full rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="truncate">
                  {selectedOption?.companies.join(", ")}
                </span>
              </div>
            </div>
            <div className="text-left md:text-right">
              <p className="text-sm text-muted-foreground">
                Interview Readiness Score
              </p>
              <p className="mt-2 text-4xl font-semibold text-foreground">
                {score}%
              </p>
              <span
                className={`mt-3 inline-flex rounded-full border px-3 py-1.5 text-sm font-semibold ${
                  isReady
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                }`}
              >
                {isReady ? "Ready" : "Practice More"}
              </span>
            </div>
          </div>
        </div>

        <h3 className="mt-6 text-base font-semibold text-foreground">
          Section wise interview performance
        </h3>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <PerformancePill
            label="Thinking"
            tone={getScoreTone(assessment.thinking_avg)}
            value={`${Math.round(assessment.thinking_avg)}%`}
          />
          <PerformancePill
            label="Language"
            tone={getScoreTone(assessment.language_avg)}
            value={`${Math.round(assessment.language_avg)}%`}
          />
          <PerformancePill
            label="Confidence"
            tone={getScoreTone(assessment.confidence_avg)}
            value={`${Math.round(assessment.confidence_avg)}%`}
          />
          <PerformancePill
            label="Salary Band"
            tone={getScoreTone(assessment.total_score)}
            value={assessment.salary_band}
          />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Detailed report
        </h2>
        <div className="mt-4 space-y-4">
          {DETAIL_SECTIONS.map((section) => (
            <ReportSection
              key={section.key}
              open={openSections[section.key] ?? false}
              section={section}
              onToggle={() =>
                setOpenSections((current) => ({
                  ...current,
                  [section.key]: !current[section.key],
                }))
              }
            />
          ))}
        </div>
      </section>

      {(props.report.strengths.length > 0 ||
        props.report.improvement_areas.length > 0) && (
        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-base font-semibold text-foreground">
              Strengths
            </h3>
            <ul className="mt-3 space-y-2">
              {props.report.strengths.map((strength) => (
                <li
                  key={strength}
                  className="flex items-start gap-2 text-sm leading-6 text-muted-foreground"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  {strength}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-base font-semibold text-foreground">
              Improvement Areas
            </h3>
            <ul className="mt-3 space-y-2">
              {props.report.improvement_areas.map((area) => (
                <li
                  key={area}
                  className="flex items-start gap-2 text-sm leading-6 text-muted-foreground"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  {area}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-sm leading-6 text-muted-foreground">
        <div className="flex gap-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p>
            <span className="font-semibold text-foreground">Note:</span>
            <span className="ml-1">
              We haven&apos;t evaluated your subject knowledge or domain depth.
              This is purely based on T, L, &amp; C Skills. The soft skills any
              HR or non-domain interviewer gauges in entry-level interviews.
            </span>
          </p>
        </div>
      </div>
    </>
  );
}

function PerformancePill(props: {
  label: string;
  value: string;
  tone: "green" | "red" | "amber" | "purple";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
      <span className="text-muted-foreground">{props.label}</span>
      <LevelBadge label={props.value} tone={props.tone} />
    </div>
  );
}

function ReportSection(props: {
  section: {
    key: string;
    title: string;
    level: string;
    tone: "green" | "red" | "amber" | "purple";
    icon: ReactNode;
    summary: string;
    items: {
      title: string;
      body: string;
      tag: string;
      tone: "green" | "red" | "purple" | "amber";
    }[];
  };
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <button
        className="flex w-full flex-wrap items-center justify-between gap-4 text-left"
        type="button"
        onClick={props.onToggle}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            {props.section.icon}
          </span>
          <h3 className="text-base font-semibold text-foreground">
            {props.section.title}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <LevelBadge
            label={`Level - ${props.section.level}`}
            tone={props.section.tone}
          />
          {props.open ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </div>
      </button>

      {props.open ? (
        <div className="mt-4">
          <div className="grid gap-3 md:grid-cols-3">
            {props.section.items.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border bg-background p-3.5"
              >
                <h4 className="text-sm font-semibold text-foreground">
                  {item.title}
                </h4>
                <p className="mt-1.5 min-h-12 text-sm leading-5 text-muted-foreground">
                  {item.body}
                </p>
                <LevelBadge
                  className="mt-4"
                  label={item.tag}
                  tone={item.tone}
                />
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            <strong className="text-foreground">Summary:</strong>{" "}
            {props.section.summary}
          </p>
        </div>
      ) : null}
    </article>
  );
}

function LevelBadge(props: {
  label: string;
  tone: "green" | "red" | "purple" | "amber";
  className?: string;
}) {
  const classNameByTone: Record<typeof props.tone, string> = {
    green:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    red: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
    purple: "border-primary/20 bg-primary/10 text-primary dark:text-primary",
    amber:
      "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${classNameByTone[props.tone]} ${props.className ?? ""}`}
    >
      {props.label}
    </span>
  );
}

function getScoreTone(score: number): "green" | "red" | "amber" | "purple" {
  if (score >= 80) return "green";
  if (score >= 50) return "amber";
  return "red";
}

function getLevelTone(
  level: string | undefined,
): "green" | "red" | "amber" | "purple" {
  if (!level) return "red";
  if (level.startsWith("C")) return "green";
  if (level.startsWith("B2")) return "purple";
  if (level.startsWith("B1")) return "amber";
  return "red";
}

function getThinkingTone(level: string): "green" | "red" | "amber" | "purple" {
  if (level === "TF5" || level === "TF4") return "green";
  if (level === "TF3") return "amber";
  return "red";
}

function getConfidenceTone(
  level: string,
): "green" | "red" | "amber" | "purple" {
  if (level === "VCP4" || level === "VCP3") return "green";
  if (level === "VCP2") return "amber";
  return "red";
}
