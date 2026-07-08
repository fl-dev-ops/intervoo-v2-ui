"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Blocks,
  CheckCircle2,
  ExternalLink,
  FileText,
  Goal,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";
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
import {
  jobsKeys,
  useJobAnalysis,
  useJobMatch,
  useSourceUrlStatus,
} from "@/hooks/jobs/hooks";
import { useIsMobile } from "@/hooks/use-mobile";
import { getLogoText } from "@/lib/company";
import type { FitSection, SkillChip } from "@/lib/jd-client";
import { cn } from "@/lib/utils";

export type JobDetailCardProps = {
  companyName: string;
  description?: string;
  experience?: string;
  jobId?: string;
  location?: string | null;
  onAddSkills?: (jobSkills: string[]) => void;
  onStartInterview?: () => void;
  refreshKey?: number;
  overallScore?: number | null;
  roundCount: number;
  salary?: string | null;
  showFitDetails?: boolean;
  skills?: string | null;
  sourceUrl?: string | null;
  jobTitle: string;
  workMode?: string | null;
};

type PostingStatus = "available" | "unavailable" | "unknown";

export function JobDetailCard({
  companyName,
  description,
  experience,
  jobId,
  location,
  onAddSkills,
  onStartInterview,
  overallScore,
  refreshKey = 0,
  roundCount,
  salary,
  showFitDetails = true,
  skills,
  sourceUrl,
  jobTitle,
  workMode,
}: JobDetailCardProps) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const matchQuery = useJobMatch(jobId);
  const analysisQuery = useJobAnalysis(jobId, matchQuery.data?.match, {
    enabled: matchQuery.data?.hasAnalysisEvidence === true,
  });
  const sourceUrlQuery = useSourceUrlStatus(sourceUrl ?? undefined);

  const match = matchQuery.data?.match ?? null;
  const analysis = analysisQuery.data ?? null;
  const hasAnalysisEvidence = matchQuery.data
    ? matchQuery.data.hasAnalysisEvidence
    : null;
  const isMatchLoading = Boolean(jobId) && matchQuery.isPending;
  const isAnalysisLoading =
    Boolean(jobId) &&
    (matchQuery.isPending ||
      (matchQuery.data?.hasAnalysisEvidence === true &&
        analysisQuery.isPending));
  const matchError =
    matchQuery.error instanceof Error ? matchQuery.error.message : null;
  const analysisError =
    analysisQuery.error instanceof Error ? analysisQuery.error.message : null;
  const postingStatus: "checking" | PostingStatus | null = !sourceUrl
    ? null
    : (sourceUrlQuery.data ?? "checking");

  // Add-skills saves bump `refreshKey`; refetch fit data when it changes.
  useEffect(() => {
    if (!jobId || refreshKey === 0) return;
    void queryClient.invalidateQueries({ queryKey: jobsKeys.match(jobId) });
    void queryClient.invalidateQueries({ queryKey: jobsKeys.analysis(jobId) });
  }, [jobId, queryClient, refreshKey]);

  const skillChips = analysis
    ? getSkillChips(analysis.skills)
    : hasAnalysisEvidence === false
      ? getNeutralSkillChips(skills)
      : [];
  const shouldShowFitDetails = showFitDetails && Boolean(jobId || skills);
  const showStartInterview = Boolean(jobId && onStartInterview);
  const meta = [experience, location, workMode].filter(Boolean);

  const shouldShowPosting =
    postingStatus === "available" || postingStatus === "unknown";

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
              <div className="flex min-w-0 items-start gap-3 md:gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-[#DDD8DF] bg-white p-2 text-center text-xs font-extrabold leading-tight text-[#5436B8] md:size-16 md:text-sm">
                  {getLogoText(companyName)}
                </div>
                <div className="min-w-0">
                  <p className="text-base font-medium text-[#6D6873] md:text-sm">
                    {companyName}
                  </p>
                  <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-black">
                    {jobTitle}
                  </h1>
                  {meta.length > 0 ? (
                    <p className="mt-2 text-sm font-medium text-[#6D6873] md:text-xs">
                      {meta.join(" · ")}
                    </p>
                  ) : null}
                </div>
              </div>
              {showStartInterview ? (
                <div className="flex shrink-0 items-center gap-5">
                  <MatchScoreRing
                    loading={isMatchLoading}
                    score={match?.score ?? null}
                  />
                  <button
                    className="hidden h-14 items-center justify-center rounded-full bg-[linear-gradient(90deg,#5B37C8_0%,#6D47F4_100%)] px-8 text-sm font-bold text-white hover:opacity-95 md:inline-flex"
                    type="button"
                    onClick={onStartInterview}
                  >
                    Start Interview
                  </button>
                </div>
              ) : null}
            </div>

            {showStartInterview && sourceUrl && shouldShowPosting ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#F7F3FF] px-3 py-2 text-sm font-semibold text-[#5E41CF] md:text-xs"
              >
                <SourceIcon sourceUrl={sourceUrl} />
                View original posting
              </a>
            ) : null}

            {description ? (
              <p className="mt-5 max-w-4xl text-base leading-6 text-[#6D6873] md:text-sm">
                {description}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              {salary ? (
                <Badge
                  className="h-auto rounded-lg bg-[#F3F3F4] px-3 py-2 text-base font-semibold text-black md:text-sm"
                  variant="secondary"
                >
                  {salary}
                </Badge>
              ) : null}
              {/* {isMatchLoading ? (
                <ScoreSkeletons />
              ) : (
                <>
                  <ScorePill label="Skills" value={match?.skillsPct} />
                  <ScorePill label="Projects" value={match?.projectsPct} />
                </>
              )} */}
              <Badge
                className={cn(
                  "h-auto rounded-lg bg-[#F3F0F4] px-3 py-2 text-base font-semibold text-black md:text-sm",
                  showStartInterview && "hidden md:inline-flex",
                )}
                variant="secondary"
              >
                {roundCount} Rounds
              </Badge>
            </div>

            {showStartInterview ? (
              <button
                className="mt-5 inline-flex h-14 w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#5B37C8_0%,#6D47F4_100%)] px-8 text-base font-bold text-white hover:opacity-95 md:hidden"
                type="button"
                onClick={onStartInterview}
              >
                Start Interview
              </button>
            ) : null}
          </CardContent>
        </Card>

        {!showStartInterview ? (
          <Card className="rounded-2xl border-0 bg-white shadow-none">
            <CardContent className="px-4">
              <InterviewReadinessScore
                className="border-0 p-0"
                score={overallScore ?? null}
              />
            </CardContent>
          </Card>
        ) : null}
      </div>

      {shouldShowFitDetails ? (
        <>
          <SectionCard
            action="+ Add Skills"
            onAction={() => onAddSkills?.(skillChips.map((s) => s.skill))}
            title="Skills"
          >
            {analysis || hasAnalysisEvidence === false ? (
              skillChips.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skillChips.map((skill) => (
                    <Badge
                      key={skill.skill}
                      className={cn(
                        "h-auto rounded-lg gap-2 px-3 py-2 text-sm font-semibold",
                        skill.matched
                          ? "bg-[#E7FCE9] text-[#D96A00]"
                          : "bg-[#F3F3F4] text-black",
                      )}
                      variant="secondary"
                    >
                      {skill.matched ? <span>✅</span> : null}
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

          {hasAnalysisEvidence === false ? null : analysis ? (
            <Accordion
              key={isMobile ? "mobile" : "desktop"}
              className="gap-5"
              defaultValue={
                isMobile
                  ? []
                  : ["responsibilities", "requirements", "nice-to-have"]
              }
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
  onAction,
  title,
}: {
  action?: string;
  children: ReactNode;
  onAction?: () => void;
  title: string;
}) {
  return (
    <Card className="rounded-2xl border-0 bg-white shadow-none">
      <CardContent className="px-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-base font-extrabold uppercase tracking-wide text-[#6D6873] md:text-sm">
            {title}
          </h2>
          {action ? (
            <button
              className="text-base font-bold text-[#6D6873] md:text-sm"
              type="button"
              onClick={onAction}
            >
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
    return (
      <Skeleton className="size-18 rounded-full bg-[#F3F0F4] md:size-16" />
    );
  }

  return (
    <div className="flex size-18 items-center justify-center rounded-full border-2 border-[#00B87A] text-lg font-extrabold text-black md:size-16 md:text-base">
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
      <AccordionTrigger className="py-4 text-base font-extrabold uppercase tracking-wide text-[#6D6873] hover:no-underline md:text-sm">
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
        {/*{groupIcon}*/}
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
      className="h-auto rounded-lg bg-[#F3F3F4] px-3 py-2 text-base font-semibold text-black md:text-sm"
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

function getNeutralSkillChips(skills: string | null | undefined): SkillChip[] {
  return (skills ?? "")
    .split(/[,;|]/)
    .map((skill) => skill.trim())
    .filter(Boolean)
    .map((skill) => ({ skill, matched: false }));
}
