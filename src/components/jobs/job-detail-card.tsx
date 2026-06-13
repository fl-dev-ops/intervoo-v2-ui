"use client";

import { FileText } from "lucide-react";
import { InterviewReadinessScore } from "@/components/diagnostics/interview-readiness-score";

export type JobDetailCardProps = {
  companyName: string;
  description?: string;
  experience?: string;
  overallScore?: number | null;
  roundCount: number;
  sourceUrl?: string | null;
  jobTitle: string;
};

export function JobDetailCard({
  companyName,
  description,
  experience,
  overallScore,
  roundCount,
  sourceUrl,
  jobTitle,
}: JobDetailCardProps) {
  return (
    <div className="grid w-full gap-4 md:grid-cols-[1fr_330px]">
      {/* Left card — company details */}
      <div className="rounded-2xl bg-white px-5 py-5">
        <div>
          <div className="flex items-center gap-4">
            <div className="flex size-18 shrink-0 items-center justify-center rounded-xl border border-[#DAD6DE] bg-white p-2 text-center text-sm font-extrabold leading-none text-[#F0642E]">
              {getLogoText(companyName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#6D6873]">
                {companyName}
              </p>
              <h1 className="mt-1 text-xl font-extrabold tracking-tight text-black">
                {jobTitle}
              </h1>
              <div className="mt-2 flex flex-wrap gap-2">
                {experience && (
                  <span className="rounded-full bg-[#F3F0F4] px-3 py-1 text-xs font-bold text-black">
                    {experience}
                  </span>
                )}
                <span className="rounded-full border border-[#E0DDE4] bg-white px-3 py-1 text-xs font-bold text-black">
                  {roundCount} Rounds
                </span>
              </div>
            </div>
          </div>
          <div>
            {description && (
              <p className="mt-4 max-w-130 text-sm leading-6 text-[#6D6873]">
                {description}
              </p>
            )}
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#F7F3FF] px-3 py-2 text-sm font-semibold text-[#5E41CF]"
              >
                <FileText className="size-4 text-black" />
                Read Job description
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Right card — interview readiness */}
      <div className="rounded-2xl bg-white p-4">
        <InterviewReadinessScore score={overallScore ?? null} />
      </div>
    </div>
  );
}

function getLogoText(companyName: string) {
  const words = companyName.split(/\s+/).filter(Boolean);
  if (!words.length) return "JOB";
  if (words.length === 1) return words[0].slice(0, 6).toUpperCase();
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}
