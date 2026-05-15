"use client";

import { InterviewReadinessScore } from "@/components/diagnostics/interview-readiness-score";
import type { DiagnosticBandConfig } from "@/lib/diagnostics/bands-config";

export type DiagnosticsJobHeaderProps = {
  bandConfig: DiagnosticBandConfig | undefined;
  overallScore?: number | null;
};

export function DiagnosticsJobHeader({
  bandConfig,
  overallScore,
}: DiagnosticsJobHeaderProps) {
  return (
    <div className="w-full rounded-2xl md:border border-border bg-transparent md:bg-card p-4 md:p-6 shadow-none md:shadow-sm mb-4">
      <div className="w-full grid grid-cols-1 md:grid-cols-10 gap-y-8">
        {/* Job Info */}
        <div className="col-span-1 md:col-span-6 flex-1 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
                {bandConfig?.title ?? "SDE at Product companies"}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground leading-6">
                {bandConfig?.description ??
                  "Problem solving, behavioural communication, and technical fundamentals expected in growing product companies."}
              </p>
              <span className="mt-3 w-fit hidden md:block shrink-0 rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white">
                {bandConfig?.salary ?? "₹8–15 LPA"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              bandConfig?.companies ?? [
                "Adobe",
                "Zomato",
                "Flipkart",
                "JP Morgan Tech",
                "Qualcomm",
              ]
            ).map((company) => (
              <span
                key={company}
                className="rounded-full border border-border bg-[#EBE6EF] px-3 py-1 text-xs font-medium text-primary"
              >
                {company}
              </span>
            ))}
          </div>
        </div>

        {/* Interview Readiness Score */}
        <div className="col-span-1 md:col-span-4 shrink-0 px-4 py-2">
          <InterviewReadinessScore score={overallScore} />
        </div>
      </div>
    </div>
  );
}
