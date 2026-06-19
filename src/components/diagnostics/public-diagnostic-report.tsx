"use client";

import { IconBrandWechat, IconClock } from "@tabler/icons-react";
import { Check, Info, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { JobDetailCard } from "@/components/jobs/job-detail-card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Spinner } from "@/components/ui/spinner";
import type { DiagnosticBandConfig } from "@/lib/diagnostics/bands-config";
import { DIAGNOSTIC_ROUNDS } from "@/lib/diagnostics/rounds-config";
import type { JobDetail } from "@/lib/jd-client";
import type {
  DiagnosticLanguageDimension,
  DiagnosticLanguageLevel,
  DiagnosticQuestionResponse,
  DiagnosticReportJson,
  DiagnosticThinkingDimension,
  DiagnosticThinkingLevel,
} from "@/lib/report-generation/diagnostic-report.types";
import { cn } from "@/lib/utils";

export type PublicRoundData =
  | {
      roundNumber: number;
      roundType: string;
      roundTitle: string;
      hasReport: true;
      shareToken: string | null;
      talkTimeMinutes: number | null;
      askedQuestionCount: number | null;
      questionsMayCover: string[];
      report: DiagnosticReportJson;
    }
  | {
      roundNumber: number;
      roundType: string;
      roundTitle: string;
      hasReport: false;
      shareToken: string | null;
      talkTimeMinutes: number | null;
      askedQuestionCount: number | null;
      questionsMayCover: string[];
      report: null;
      isFailed: boolean;
    };

export type PublicDiagnosticReportProps = {
  apiJob?: JobDetail | null;
  backHref?: string;
  backLabel?: string;
  bandConfig: DiagnosticBandConfig | undefined;
  completedRoundCount?: number;
  focusedRoundNumber: number;
  isOwner: boolean;
  jobId?: string | null;
  overallScore: number | null;
  preferredName: string | null;
  resume?: {
    name: string | null;
    email: string | null;
    phoneNumber: string | null;
    education?: Array<{
      degree: string;
      stream: string;
      institution: string;
      graduationYear: string;
      score: string;
    }>;
  };
  rounds: PublicRoundData[];
  user?: {
    email: string | null;
    name: string | null;
  };
  userDisplayOnly?: boolean;
};

export function PublicDiagnosticReport({
  apiJob,
  backHref: _backHref,
  backLabel: _backLabel,
  bandConfig,
  completedRoundCount = 0,
  focusedRoundNumber,
  isOwner,
  jobId,
  overallScore,
  preferredName: _preferredName,
  resume,
  rounds,
  user,
  userDisplayOnly = false,
}: PublicDiagnosticReportProps) {
  const [activeRoundNumber, setActiveRoundNumber] =
    useState(focusedRoundNumber);

  const activeRound = rounds.find((r) => r.roundNumber === activeRoundNumber);

  const companyName = apiJob?.companyName ?? bandConfig?.companies?.[0] ?? "";
  const jobTitle =
    apiJob?.jobTitle ?? bandConfig?.title ?? "SDE at Product companies";
  const experience = apiJob
    ? (() => {
        const min = apiJob.experienceMinYears;
        const max = apiJob.experienceMaxYears;
        if (min == null && max == null) return "";
        if (min != null && max != null) return `${min}-${max} years`;
        if (min != null) return `${min}+ years`;
        return `Up to ${max} years`;
      })()
    : (bandConfig?.salary ?? "");
  const roundCount = apiJob?.rounds?.length ?? 4;
  const description = apiJob?.roleSummary ?? bandConfig?.description ?? "";
  const sourceUrl = apiJob?.sourceUrl ?? null;

  return (
    <>
      <AppHeader displayOnly={userDisplayOnly} user={user} />
      <main className="min-h-dvh bg-lavender md:pb-10">
        <div className="mx-auto w-full max-w-225 space-y-6 px-4 md:py-8">
          {/* User details secondary header */}
          {resume && (
            <div className="rounded-2xl bg-white px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#242225] text-sm font-bold text-white">
                  {getInitial(resume.name ?? resume.email)}
                </div>
                <div className="min-w-0 flex-1">
                  {/* First row — full name */}
                  <p className="text-base font-semibold text-black truncate">
                    {resume.name || "User"}
                  </p>
                  {/* Second row — education left, completed rounds right */}
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="text-sm text-[#6D6873] truncate">
                      {formatEducation(resume.education)}
                    </p>
                    <p className="shrink-0 text-sm font-medium text-[#6D6873]">
                      Completed rounds{" "}
                      <span className="font-bold text-black">
                        {completedRoundCount}/4
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <JobDetailCard
            companyName={companyName}
            description={description}
            experience={experience}
            overallScore={overallScore}
            roundCount={roundCount}
            sourceUrl={sourceUrl}
            jobTitle={jobTitle}
          />

          {isOwner && completedRoundCount >= 4 ? (
            <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-base font-bold text-black">
                    Ready for another practice?
                  </p>
                  <p className="mt-1 text-sm text-[#6D6873]">
                    Pick another JD and complete a fresh set of four rounds.
                  </p>
                </div>
                <a
                  className="inline-flex h-11 items-center justify-center rounded-full bg-button px-5 text-sm font-bold text-white transition hover:opacity-95"
                  href="/jobs"
                >
                  Start new interview practice
                </a>
              </div>
            </div>
          ) : null}

          <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <RoundTabs
              activeRoundNumber={activeRoundNumber}
              rounds={rounds}
              onSelect={setActiveRoundNumber}
            />

            {activeRound?.hasReport ? (
              <RoundDetailView round={activeRound} />
            ) : activeRound ? (
              <div className="px-4 pb-4">
                <RoundStartCard
                  round={activeRound}
                  isOwner={isOwner}
                  jobId={jobId}
                />
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </>
  );
}

function getInitial(nameOrEmail: string | null | undefined): string {
  const source = nameOrEmail?.trim() || "U";
  return source.charAt(0).toUpperCase();
}

function formatEducation(
  education?: Array<{ degree: string; stream: string; institution: string }>,
): string {
  if (!education?.length) return "";
  const latest = education[0];
  const parts = [latest.degree, latest.stream, latest.institution].filter(
    Boolean,
  );
  return parts.join(", ");
}

function RoundTabs({
  activeRoundNumber,
  rounds,
  onSelect,
}: {
  activeRoundNumber: number;
  rounds: PublicRoundData[];
  onSelect: (roundNumber: number) => void;
}) {
  return (
    <div className="bg-white p-4">
      <div className="flex gap-3 overflow-x-auto pb-1">
        {rounds.map((round) => {
          const isActive = round.roundNumber === activeRoundNumber;
          const config = DIAGNOSTIC_ROUNDS[round.roundNumber - 1];
          const shortTitle = config
            ? config.id === "screening"
              ? "Screening"
              : config.id === "behavioural"
                ? "Behavioural"
                : config.id === "technical-thinking"
                  ? "Technical"
                  : config.id === "career-readiness"
                    ? "Culture fit"
                    : config.title
            : "Round";
          const performance = round.hasReport
            ? getPerformanceBadge(
                Math.round(round.report.assessment_result.total_score),
              )
            : null;

          return (
            <button
              className={cn(
                "flex h-12 min-w-[180px] items-center justify-between gap-4 rounded-xl border border-[#D7D7D7] bg-white px-4 text-left text-base font-medium text-[#353238] transition hover:border-[#6C47FF]/60",
                isActive && "border-[#6C47FF] bg-[#F7F3FF]",
              )}
              key={round.roundNumber}
              type="button"
              onClick={() => onSelect(round.roundNumber)}
            >
              <span className="truncate">{shortTitle}</span>
              {performance ? (
                <span
                  className="shrink-0 rounded-full px-4 py-1.5 text-sm font-bold text-white"
                  style={{ backgroundColor: performance.color }}
                >
                  {performance.label}
                </span>
              ) : (
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#ECE5FF] text-[#6C47FF]">
                  <Play className="size-4 fill-current" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RoundDetailView({
  round,
}: {
  round: PublicRoundData & { hasReport: true };
}) {
  const report = round.report;
  const assessment = report.assessment_result;

  return (
    <div>
      <FeedbackCard
        improvements={report.improvement_areas}
        strengths={report.strengths}
        talkTimeMinutes={round.talkTimeMinutes}
      />

      <QuestionWiseAnalysis responses={assessment.question_responses} />
    </div>
  );
}

function FeedbackCard({
  improvements,
  strengths,
  talkTimeMinutes,
}: {
  improvements: string[];
  strengths: string[];
  talkTimeMinutes: number | null;
}) {
  if (strengths.length === 0 && improvements.length === 0) {
    return null;
  }

  return (
    <div className="bg-white px-4 pb-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
          <span aria-hidden="true">✨</span>
          Key Summary
        </h3>
        <div className="flex items-center gap-3 text-sm text-[#7B7B7B]">
          <span className="flex items-center gap-1">
            <IconClock className="size-4" />
            Talktime: {formatTalkTime(talkTimeMinutes)}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {strengths.length > 0 && (
          <div className="rounded-xl bg-emerald-100/80 p-5">
            <h5 className="text-sm font-semibold text-emerald-900">
              What you did well
            </h5>
            <ul className="mt-3 space-y-3">
              {strengths.map((strength) => (
                <li
                  key={strength}
                  className="flex items-start gap-3 text-sm leading-6 text-emerald-800"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {improvements.length > 0 && (
          <div className="rounded-xl bg-red-100/80 p-5">
            <h5 className="text-sm font-semibold text-red-900">
              Needs to improve
            </h5>
            <ul className="mt-3 space-y-3">
              {improvements.map((area) => (
                <li
                  key={area}
                  className="flex items-start gap-3 text-sm leading-6 text-red-800"
                >
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  {area}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTalkTime(talkTimeMinutes: number | null) {
  if (typeof talkTimeMinutes !== "number" || talkTimeMinutes <= 0) {
    return "--";
  }

  return `${talkTimeMinutes} min`;
}

// ─── Question-wise analysis ───────────────────────────────────────────────────

const THINKING_DIMENSION_LABELS: Record<DiagnosticThinkingDimension, string> = {
  Relevance: "Relevance",
  Specificity: "Specificity",
  Reasoning: "Reasoning",
  JobCompetency: "Job competency",
};

const LANGUAGE_DIMENSION_LABELS: Record<DiagnosticLanguageDimension, string> = {
  Fluency: "Fluency",
  Grammar: "Grammar",
  Range: "Range",
  Coherence: "Coherence",
  Interaction: "Interaction",
};

// Confidence scoring stays in the backend (diagnostic-scoring.ts) and is
// stored on the report. It is intentionally excluded from question selection
// here because confidence feedback is delivered via video coaching, not text.
const THINKING_SCORE_MAP: Record<DiagnosticThinkingLevel, number> = {
  TF1: 1,
  TF2: 1,
  TF3: 2,
  TF4: 3,
  TF5: 3,
};

const LANGUAGE_SCORE_MAP: Record<DiagnosticLanguageLevel, number> = {
  "Pre-A1": 1,
  A1: 1,
  A2: 1,
  B1: 2,
  B2: 3,
  C1: 3,
  C2: 3,
};

type WeakDimension = {
  label: string;
  feedback: string;
};

type SelectedQuestion = {
  response: DiagnosticQuestionResponse;
  weakDimensions: WeakDimension[];
};

function getQuestionAvgScore(response: DiagnosticQuestionResponse): number {
  const scores: number[] = [];

  for (const [, level] of Object.entries(response.thinking_levels ?? {})) {
    if (level)
      scores.push(THINKING_SCORE_MAP[level as DiagnosticThinkingLevel]);
  }
  for (const [, level] of Object.entries(response.language_levels ?? {})) {
    if (level)
      scores.push(LANGUAGE_SCORE_MAP[level as DiagnosticLanguageLevel]);
  }

  if (!scores.length) return 3;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function getWeakDimensions(
  response: DiagnosticQuestionResponse,
): WeakDimension[] {
  const weak: WeakDimension[] = [];

  for (const [dim, level] of Object.entries(response.thinking_levels ?? {})) {
    const score = level
      ? THINKING_SCORE_MAP[level as DiagnosticThinkingLevel]
      : null;
    if (score !== null && score <= 2) {
      const feedback =
        response.reasoning.thinking?.[dim as DiagnosticThinkingDimension];
      if (feedback) {
        weak.push({
          label: THINKING_DIMENSION_LABELS[dim as DiagnosticThinkingDimension],
          feedback,
        });
      }
    }
  }

  for (const [dim, level] of Object.entries(response.language_levels ?? {})) {
    const score = level
      ? LANGUAGE_SCORE_MAP[level as DiagnosticLanguageLevel]
      : null;
    if (score !== null && score <= 2) {
      const feedback =
        response.reasoning.language?.[dim as DiagnosticLanguageDimension];
      if (feedback) {
        weak.push({
          label: LANGUAGE_DIMENSION_LABELS[dim as DiagnosticLanguageDimension],
          feedback,
        });
      }
    }
  }

  return weak;
}

function selectQuestionsForAnalysis(
  responses: DiagnosticQuestionResponse[],
  max = 4,
): SelectedQuestion[] {
  return responses
    .map((response) => ({
      response,
      weakDimensions: getWeakDimensions(response),
      avgScore: getQuestionAvgScore(response),
    }))
    .filter(({ weakDimensions }) => weakDimensions.length > 0)
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, max)
    .map(({ response, weakDimensions }) => ({ response, weakDimensions }));
}

function QuestionWiseAnalysis({
  responses,
}: {
  responses: DiagnosticQuestionResponse[];
}) {
  const selected = selectQuestionsForAnalysis(responses);

  if (!selected.length) return null;

  return (
    <Accordion defaultValue={["question-analysis"]}>
      <AccordionItem
        className="overflow-hidden border-t border-border bg-white"
        value="question-analysis"
      >
        <AccordionTrigger className="p-4 text-left hover:no-underline">
          <span className="flex items-center gap-2 text-base font-bold text-foreground">
            <IconBrandWechat className="size-5" />
            Question wise analysis
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-4">
          <div className="space-y-4 bg-[#F0EFF2] p-4 rounded-xl">
            {selected.map(({ response, weakDimensions }) => (
              <QuestionFeedbackCard
                key={response.question_id}
                response={response}
                weakDimensions={weakDimensions}
              />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function QuestionFeedbackCard({
  response,
  weakDimensions,
}: {
  response: DiagnosticQuestionResponse;
  weakDimensions: WeakDimension[];
}) {
  if (!response.question_text) return null;

  return (
    <div className="space-y-5 pt-4 first:pt-0">
      {/* Agent message — white bubble, left-aligned */}
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-2xl bg-white px-4 py-3">
          <p className="text-sm font-bold text-black-foreground mb-1!">Sara</p>
          <p className="text-sm font-normal leading-6 text-foreground">
            {response.question_text}
          </p>
        </div>
      </div>

      {/* User message — right-aligned, two parts joined */}
      {response.candidate_answer && (
        <div className="flex flex-col items-end">
          <div className="max-w-[85%] overflow-hidden rounded-2xl">
            {/* Actual answer */}
            <div className="bg-[#6C47FF] px-4 py-3">
              <p className="text-sm leading-6 text-white">
                {response.candidate_answer}
              </p>
            </div>

            {/* Feedback + reframed answer — joined below */}
            <div className="bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground m-0!">
                  Feedback
                </p>
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                  Needs work
                </span>
              </div>

              {response.reframed_answer ? (
                <div className="mt-2 rounded-xl bg-[#FEF9E7] px-4 py-3">
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <span aria-hidden="true">✨</span>
                    <p className="text-xs font-semibold text-foreground">
                      Reframed Answer
                    </p>
                  </div>
                  <p className="text-sm italic leading-6 text-[#6B6B72]">
                    {response.reframed_answer}
                  </p>
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  {weakDimensions.map(({ label, feedback }) => (
                    <div
                      key={label}
                      className="rounded-xl bg-[#F0EFF2] px-4 py-3"
                    >
                      <p className="mb-1 text-xs font-semibold text-foreground">
                        {label}
                      </p>
                      <p className="text-xs leading-5 text-muted-foreground">
                        {feedback}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function RoundStartCard({
  round,
  isOwner,
  jobId,
}: {
  round: PublicRoundData & { hasReport: false };
  isOwner: boolean;
  jobId?: string | null;
}) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const config = DIAGNOSTIC_ROUNDS[round.roundNumber - 1];
  const roundName = config?.title ?? `Round ${round.roundNumber}`;

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-foreground">
          Round {round.roundNumber} - {roundName}
        </h3>
      </div>

      <p className="text-sm leading-6 text-muted-foreground">
        {config?.description ?? ""}
      </p>

      {round.questionsMayCover.length > 0 && (
        <div className="mt-4 grid items-end gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-[#6B6B7A]">
              Questions may cover
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {round.questionsMayCover.map((question) => (
                <span
                  key={question}
                  className="rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs text-gray-600"
                >
                  {question}
                </span>
              ))}
            </div>
          </div>

          <button
            className="col-span-2 w-full rounded-full bg-button px-10 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 md:col-span-1 md:ml-auto inline-flex items-center justify-center gap-2"
            disabled={isNavigating}
            type="button"
            onClick={() => {
              setIsNavigating(true);
              router.push(
                jobId
                  ? `/jobs/${jobId}/prejoin?round=${round.roundType}`
                  : "/jobs",
              );
            }}
          >
            {isNavigating ? (
              <Spinner className="size-4" />
            ) : (
              <Play className="mr-1 size-3 fill-current" />
            )}
            {isNavigating
              ? "Starting..."
              : isOwner && round.isFailed
                ? `Retry Round ${round.roundNumber}`
                : `Start Round ${round.roundNumber}`}
          </button>
        </div>
      )}
    </div>
  );
}

function getPerformanceBadge(score: number): {
  label: string;
  color: string;
} {
  if (score >= 90) return { label: "Excellent", color: "#4D8F62" };
  if (score >= 70) return { label: "Good", color: "#F49B22" };
  if (score >= 50) return { label: "Average", color: "#DE7B48" };
  return { label: "Poor", color: "#C7433F" };
}
