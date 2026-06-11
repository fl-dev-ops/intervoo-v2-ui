"use client";

import { IconFileDescription } from "@tabler/icons-react";
import { InterviewReadinessScore } from "@/components/diagnostics/interview-readiness-score";
import type { DiagnosticBandConfig } from "@/lib/diagnostics/bands-config";
import type { JobDetail } from "@/lib/jd-client";

export type DiagnosticsJobHeaderProps = {
  bandConfig: DiagnosticBandConfig | undefined;
  apiJob?: JobDetail | null;
  overallScore?: number | null;
};

export function DiagnosticsJobHeader({
  bandConfig,
  apiJob,
  overallScore,
}: DiagnosticsJobHeaderProps) {
  const companyName = apiJob?.companyName ?? bandConfig?.companies?.[0] ?? "";
  const jobTitle = apiJob?.jobTitle ?? bandConfig?.title ?? "SDE at Product companies";
  const salary = apiJob
    ? formatExperienceLabel(apiJob.experienceMinYears, apiJob.experienceMaxYears)
    : bandConfig?.salary ?? "₹8–15 LPA";
  const roundCount = apiJob?.rounds?.length ?? 4;
  const description =
    apiJob?.roleSummary ??
    bandConfig?.description ??
    "Problem solving, behavioural communication, and technical fundamentals expected in growing product companies.";
  const sourceUrl = apiJob?.sourceUrl ?? null;

  return (
    <div className="w-full rounded-2xl md:border border-border sm:bg-white bg-transparent p-4 md:p-6 mb-4">
      <div className="w-full grid grid-cols-1 md:grid-cols-10 gap-x-1 gap-y-4">
        {/* Job Info */}
        <div className="col-span-1 md:col-span-6 flex-1 space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-xl border border-[#DDD8DF] bg-white p-2 text-center text-sm font-extrabold leading-tight text-[#5436B8]">
              {getLogoText(companyName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                {companyName}
              </p>
              <h1 className="font-semibold tracking-tight text-xl md:text-[26px] mt-1">
                {jobTitle}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="shrink-0 rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white">
                  {salary}
                </span>
                <span className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground">
                  {roundCount} Rounds
                </span>
              </div>
            </div>
          </div>

          <p className="text-sm md:text-[15px] text-muted-foreground leading-6">
            {description}
          </p>

          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5436B8] hover:underline"
            >
              <IconFileDescription className="size-4" />
              Read Job description
            </a>
          )}
        </div>

        {/* Interview Readiness Score */}
        <div className="col-span-1 md:col-span-4 shrink-0">
          <InterviewReadinessScore score={overallScore} />
        </div>
      </div>
    </div>
  );
}

function formatExperienceLabel(min: number | null, max: number | null) {
  if (min == null && max == null) return "";
  if (min != null && max != null) return `${min}-${max} years exp`;
  if (min != null) return `${min}+ years exp`;
  return `Up to ${max} years exp`;
}

function getLogoText(companyName: string) {
  const words = companyName.split(/\s+/).filter(Boolean);
  if (!words.length) return "JOB";
  if (words.length === 1) return words[0].slice(0, 6);
  return words.slice(0, 2).map((word) => word[0]).join("");
}
