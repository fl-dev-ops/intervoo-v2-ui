import { useMemo, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BriefcaseBusiness, Shield, Target } from "lucide-react";
import { IconCircleCheckFilled } from "@tabler/icons-react";
import { Button } from "#/components/ui/button";
import type { PrediagnosticsReportStatusResponse } from "#/lib/prediagnostics/report";

function getReportBreakdownValue(
  report: NonNullable<NonNullable<PrediagnosticsReportStatusResponse["report"]>["reportJson"]>,
  key:
    | "skills_research"
    | "company_clarity"
    | "jd_awareness"
    | "tools_and_role_clarity"
    | "salary_clarity",
) {
  return report.job_research_breakdown?.[key] ?? "Not yet";
}

export function PrediagnosticsReportPreviewPage(props: {
  preferredName?: string | null;
  reportStatus: PrediagnosticsReportStatusResponse;
}) {
  const report = props.reportStatus.report?.reportJson ?? null;
  const loadError = props.reportStatus.report?.errorMessage ?? "Failed to load report.";

  if (!report || props.reportStatus.report?.status !== "READY") {
    return <PrediagnosticsReportErrorState message={loadError} />;
  }

  return <PrediagnosticsReportPreview preferredName={props.preferredName} report={report} />;
}

function PrediagnosticsReportErrorState(props: { message: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#F5F3F7] px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-[0_20px_40px_rgba(112,88,186,0.12)]">
        <h2 className="text-xl font-semibold text-[#2b2233]">Report unavailable</h2>
        <p className="mt-3 text-sm leading-6 text-[#7f768f]">{props.message}</p>
        <Button
          size={"lg"}
          className="mt-6 w-full"
          type="button"
          onClick={() => {
            window.location.href = "/prediagnostics";
          }}
        >
          Back to start
        </Button>
      </div>
    </div>
  );
}

function PrediagnosticsReportPreview({
  preferredName,
  report,
}: {
  preferredName?: string | null;
  report: NonNullable<NonNullable<PrediagnosticsReportStatusResponse["report"]>["reportJson"]>;
}) {
  const displayName = preferredName?.trim() || "there";
  const jobGoalBadge = useMemo(
    () => getPositiveBadge(report.job_awareness_category),
    [report.job_awareness_category],
  );
  const awarenessBadge = useMemo(
    () => getPositiveBadge(report.job_research_category ?? "Not Enough"),
    [report.job_research_category],
  );

  return (
    <div className="min-h-screen bg-[#F5F3F7]">
      <div className="mx-auto w-full max-w-md md:max-w-lg">
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
                  value={getReportBreakdownValue(report, "skills_research")}
                  positive
                />
                <AwarenessRow
                  label="Company knowledge"
                  value={getReportBreakdownValue(report, "company_clarity")}
                />
              </div>

              <div className="mt-4 grid gap-1 text-sm leading-7 text-[#6f667d]">
                <div className="mb-1 text-xs font-semibold tracking-[0.06em] text-[#2b2233] uppercase">
                  Need improvement
                </div>
                <AwarenessRow
                  label="JD awareness"
                  value={getReportBreakdownValue(report, "jd_awareness")}
                  warning
                />
                <AwarenessRow
                  label="Role clarity"
                  value={getReportBreakdownValue(report, "tools_and_role_clarity")}
                  warning
                />
                <AwarenessRow
                  label="Salary understanding"
                  value={getReportBreakdownValue(report, "salary_clarity")}
                  warning
                />
              </div>

              <div className="mt-4 rounded-xl border border-[#f3e9b0] bg-[#fffbe8] px-4 py-3 text-sm leading-6 text-[#5e5531]">
                Some key areas are not clear yet. Improving them will help you perform better in
                interviews.
              </div>
            </section>

            <section className="my-12 rounded-xl px-5 text-center">
              <h2 className="text-[1.35rem] font-semibold tracking-[-0.02em] text-[#2b2233]">
                Diagnostic interview coming soon
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#6f667d]">
                We&apos;re preparing the next step. Your report is ready, and the full diagnostic
                interview experience will be available soon.
              </p>
              <Button asChild size={"lg"} className="mt-6">
                <Link to="/prediagnostics" search={{ redo: true }}>
                  Retake Pre Diagnostics
                </Link>
              </Button>
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
