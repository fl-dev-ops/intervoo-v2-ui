"use client";

import {
  Blocks,
  CheckCircle2,
  ExternalLink,
  FileText,
  Goal,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { InterviewReadinessScore } from "@/components/diagnostics/interview-readiness-score";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  FitSection,
  JobFitAnalysis,
  JobMatch,
  SkillChip,
} from "@/lib/jd-client";
import { cn } from "@/lib/utils";

export type JobDetailCardProps = {
  companyName: string;
  description?: string;
  experience?: string;
  jobId?: string;
  location?: string | null;
  onStartInterview?: () => void;
  overallScore?: number | null;
  roundCount: number;
  showFitDetails?: boolean;
  skills?: string | null;
  sourceUrl?: string | null;
  jobTitle: string;
  workMode?: string | null;
};

export function JobDetailCard({
  companyName,
  description,
  experience,
  jobId,
  location,
  onStartInterview,
  overallScore,
  roundCount,
  showFitDetails = true,
  skills,
  sourceUrl,
  jobTitle,
  workMode,
}: JobDetailCardProps) {
  const [match, setMatch] = useState<JobMatch | null>(null);
  const [analysis, setAnalysis] = useState<JobFitAnalysis | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isMatchLoading, setIsMatchLoading] = useState(Boolean(jobId));
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(Boolean(jobId));
  const skillChips = getSkillChips(analysis?.skills);
  const shouldShowFitDetails = showFitDetails && Boolean(jobId || skills);
  const showStartInterview = Boolean(jobId && onStartInterview);
  const meta = [experience, location, workMode].filter(Boolean);

  useEffect(() => {
    if (!jobId) {
      setIsMatchLoading(false);
      setIsAnalysisLoading(false);
      return;
    }

    let cancelled = false;
    const activeJobId = jobId;

    async function loadFitData() {
      let didLoadMatch = false;
      setIsMatchLoading(true);
      setIsAnalysisLoading(true);
      setMatchError(null);
      setAnalysisError(null);
      setMatch(null);
      setAnalysis(null);

      try {
        const matchResponse = await fetch(
          `/api/jobs/${encodeURIComponent(activeJobId)}/match`,
          { cache: "no-store" },
        );
        const matchJson = (await matchResponse.json()) as {
          error?: string;
          match?: JobMatch;
        };

        if (!matchResponse.ok || matchJson.error || !matchJson.match) {
          throw new Error(matchJson.error || "Failed to load job match");
        }

        if (cancelled) return;
        setMatch(matchJson.match);
        didLoadMatch = true;
        setIsMatchLoading(false);
        setIsAnalysisLoading(true);

        const analysisResponse = await fetch(
          `/api/jobs/${encodeURIComponent(activeJobId)}/analysis`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ match: matchJson.match }),
          },
        );
        const analysisJson = (await analysisResponse.json()) as {
          analysis?: JobFitAnalysis;
          error?: string;
        };

        if (
          !analysisResponse.ok ||
          analysisJson.error ||
          !analysisJson.analysis
        ) {
          throw new Error(
            analysisJson.error || "Failed to load job fit analysis",
          );
        }

        if (cancelled) return;
        setAnalysis(analysisJson.analysis);
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Failed to load fit data";
        if (didLoadMatch) {
          setAnalysisError(message);
        } else {
          setMatchError(message);
          setIsMatchLoading(false);
        }
      } finally {
        if (!cancelled) {
          setIsMatchLoading(false);
          setIsAnalysisLoading(false);
        }
      }
    }

    void loadFitData();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  return (
    <div className="space-y-5">
      <div
        className={cn(
          "grid w-full gap-4",
          showStartInterview ? "md:grid-cols-1" : "md:grid-cols-[1fr_330px]",
        )}
      >
        <Card className="rounded-2xl border-0 bg-white shadow-none">
          <CardContent className="px-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#6D6873]">
                  {companyName}
                </p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-black">
                  {jobTitle}
                </h1>
                {meta.length > 0 ? (
                  <p className="mt-2 text-xs font-medium text-[#6D6873]">
                    {meta.join(" · ")}
                  </p>
                ) : null}
              </div>
              {showStartInterview ? (
                <div className="flex shrink-0 items-center gap-5">
                  <MatchScoreRing
                    loading={isMatchLoading}
                    score={match?.score ?? null}
                  />
                  <button
                    className="inline-flex h-14 items-center justify-center rounded-full bg-[linear-gradient(90deg,#5B37C8_0%,#6D47F4_100%)] px-8 text-sm font-bold text-white hover:opacity-95"
                    type="button"
                    onClick={onStartInterview}
                  >
                    Start Interview
                  </button>
                </div>
              ) : null}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {isMatchLoading ? (
                <ScoreSkeletons />
              ) : (
                <>
                  <ScorePill label="Skills" value={match?.skillsPct} />
                  <ScorePill label="Projects" value={match?.projectsPct} />
                </>
              )}
              <Badge
                className="h-auto rounded-lg bg-[#F3F0F4] px-3 py-2 text-sm font-semibold text-black"
                variant="secondary"
              >
                {roundCount} Rounds
              </Badge>
            </div>

            {description ? (
              <p className="mt-5 max-w-4xl text-[13px] leading-6 text-[#6D6873]">
                {description}
              </p>
            ) : null}
          </CardContent>
        </Card>

        {!showStartInterview ? (
          <Card className="rounded-2xl border-0 bg-white shadow-none">
            <CardContent className="px-4">
              <InterviewReadinessScore score={overallScore ?? null} />
            </CardContent>
          </Card>
        ) : null}
      </div>

      {shouldShowFitDetails ? (
        <>
          <SectionCard action="+ Add Skills" title="Skills">
            {analysis ? (
              skillChips.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skillChips.map((skill) => (
                    <Badge
                      key={skill.skill}
                      className={cn(
                        "h-auto rounded-lg px-3 py-2 text-sm font-semibold",
                        skill.matched
                          ? "bg-[#FFF8E8] text-[#D96A00]"
                          : "bg-[#F3F3F4] text-black",
                      )}
                      variant="secondary"
                    >
                      {skill.matched ? (
                        <span className="flex size-4 items-center justify-center rounded bg-[#11BF2A] text-[11px] text-white">
                          ✓
                        </span>
                      ) : null}
                      {skill.skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-[#6D6873]">
                  No skills were available for this job.
                </p>
              )
            ) : isAnalysisLoading ? (
              <SkillSkeletons />
            ) : (
              <p className="text-[13px] text-[#6D6873]">
                Skills could not be loaded from the rounds API.
              </p>
            )}
          </SectionCard>

          {analysis ? (
            <Accordion
              className="gap-5"
              defaultValue={[
                "responsibilities",
                "requirements",
                "nice-to-have",
              ]}
            >
              <FitAccordionItem
                title="Responsibilities"
                value="responsibilities"
                section={analysis.responsibilities}
              />
              <FitAccordionItem
                title="Requirements"
                value="requirements"
                section={analysis.requirements}
              />
              <FitAccordionItem
                title="Nice to have"
                value="nice-to-have"
                section={analysis.niceToHaves}
              />
            </Accordion>
          ) : isAnalysisLoading ? (
            <SectionSkeletons />
          ) : (
            <SectionCard title="Fit analysis">
              <p className="text-[13px] text-[#6D6873]">
                {matchError || analysisError
                  ? `Fit analysis could not be loaded from the rounds API: ${matchError || analysisError}`
                  : "Fit analysis is not available yet."}
              </p>
            </SectionCard>
          )}
        </>
      ) : null}
    </div>
  );
}

function SectionCard({
  action,
  children,
  title,
}: {
  action?: string;
  children: ReactNode;
  title: string;
}) {
  return (
    <Card className="rounded-2xl border-0 bg-white shadow-none">
      <CardContent className="px-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-[#6D6873]">
            {title}
          </h2>
          {action ? (
            <button className="text-sm font-bold text-[#6D6873]" type="button">
              {action}
            </button>
          ) : null}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function MatchScoreRing({
  loading,
  score,
}: {
  loading: boolean;
  score?: number | null;
}) {
  if (loading) {
    return <Skeleton className="size-16 rounded-full bg-[#F3F0F4]" />;
  }

  return (
    <div className="flex size-16 items-center justify-center rounded-full border-2 border-[#00B87A] text-base font-extrabold text-black">
      {typeof score === "number" ? `${Math.round(score)}%` : "—"}
    </div>
  );
}

function ScoreSkeletons() {
  return (
    <>
      <Skeleton className="h-9 w-36 rounded-lg bg-[#F3F0F4]" />
      <Skeleton className="h-9 w-24 rounded-lg bg-[#F3F0F4]" />
    </>
  );
}

function SkillSkeletons() {
  return (
    <div className="flex flex-wrap gap-2">
      <Skeleton className="h-9 w-28 rounded-lg bg-[#F3F0F4]" />
      <Skeleton className="h-9 w-24 rounded-lg bg-[#F3F0F4]" />
      <Skeleton className="h-9 w-32 rounded-lg bg-[#F3F0F4]" />
    </div>
  );
}

function SectionSkeletons() {
  return (
    <div className="space-y-5">
      {["Responsibilities", "Requirements", "Nice to have"].map((title) => (
        <SectionCard key={title} title={title}>
          <div className="space-y-3">
            <Skeleton className="h-4 w-36 bg-[#F3F0F4]" />
            <Skeleton className="h-4 w-full bg-[#F3F0F4]" />
            <Skeleton className="h-4 w-4/5 bg-[#F3F0F4]" />
            <Skeleton className="mt-5 h-4 w-20 bg-[#F3F0F4]" />
            <Skeleton className="h-4 w-11/12 bg-[#F3F0F4]" />
          </div>
        </SectionCard>
      ))}
    </div>
  );
}

function FitAccordionItem({
  section,
  title,
  value,
}: {
  section?: FitSection;
  title: string;
  value: string;
}) {
  if (!section?.items.length) return null;

  return (
    <AccordionItem
      className="rounded-2xl border-0 bg-white px-5 py-2 shadow-none"
      value={value}
    >
      <AccordionTrigger className="py-4 text-sm font-extrabold uppercase tracking-wide text-[#6D6873] hover:no-underline">
        {title}
      </AccordionTrigger>
      <AccordionContent className="pb-5">
        <FitGroups section={section} />
      </AccordionContent>
    </AccordionItem>
  );
}

function FitGroups({ section }: { section: FitSection }) {
  const foundItems = section.items.filter((item) => item.status === "found");
  const missingItems = section.items.filter(
    (item) => item.status === "missing",
  );

  return (
    <div className="space-y-6">
      <FitGroup
        groupIcon={<Goal className="size-4 text-[#18A957]" />}
        itemIcon={
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 fill-[#18A957] text-white" />
        }
        items={foundItems}
        title="Strong Match"
        titleClassName="text-[#2F2B35]"
      />
      <FitGroup
        groupIcon={<Blocks className="size-4 text-[#FF5A5F]" />}
        itemIcon={<XCircle className="mt-0.5 size-4 shrink-0 text-[#FF5A5F]" />}
        items={missingItems}
        title="Gap"
        titleClassName="text-[#2F2B35]"
      />
    </div>
  );
}

function FitGroup({
  groupIcon,
  itemIcon,
  items,
  title,
  titleClassName,
}: {
  groupIcon: ReactNode;
  itemIcon: ReactNode;
  items: { text: string }[];
  title: string;
  titleClassName: string;
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        {groupIcon}
        <p className={cn("text-sm font-extrabold", titleClassName)}>{title}</p>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.text}
            className="flex items-start gap-3 text-[13px] leading-5 text-[#6D6873]"
          >
            {itemIcon}
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScorePill({ label, value }: { label: string; value?: number | null }) {
  if (typeof value !== "number") return null;

  return (
    <Badge
      className="h-auto rounded-lg bg-[#F3F3F4] px-3 py-2 text-sm font-semibold text-black"
      variant="secondary"
    >
      {Math.round(value)}% {label}
    </Badge>
  );
}

function SourceIcon({ sourceUrl }: { sourceUrl: string }) {
  if (/linkedin\.com/i.test(sourceUrl)) {
    return (
      <span className="flex size-4 items-center justify-center rounded-sm bg-black text-[10px] font-black text-white">
        in
      </span>
    );
  }

  if (/naukri\.com/i.test(sourceUrl)) {
    return (
      <span className="flex size-4 items-center justify-center rounded-sm bg-black text-[10px] font-black text-white">
        N
      </span>
    );
  }

  if (/^https?:\/\//i.test(sourceUrl)) {
    return <ExternalLink className="size-4 text-black" />;
  }

  return <FileText className="size-4 text-black" />;
}

function getSkillChips(analysisSkills: SkillChip[] | undefined): SkillChip[] {
  if (analysisSkills?.length) {
    return [...analysisSkills].sort(
      (a, b) => Number(b.matched) - Number(a.matched),
    );
  }

  return [];
}
