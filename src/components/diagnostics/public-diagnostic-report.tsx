"use client";

import {
  ArrowLeft,
  Check,
  Info,
  Play,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DiagnosticsJobHeader } from "@/components/diagnostics/diagnostics-job-header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import type { DiagnosticBandConfig } from "@/lib/diagnostics/bands-config";
import { DIAGNOSTIC_ROUNDS } from "@/lib/diagnostics/rounds-config";
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
      report: DiagnosticReportJson;
    }
  | {
      roundNumber: number;
      roundType: string;
      roundTitle: string;
      hasReport: false;
      shareToken: string | null;
      report: null;
      isFailed: boolean;
    };

export type PublicDiagnosticReportProps = {
  backHref?: string;
  backLabel?: string;
  bandConfig: DiagnosticBandConfig | undefined;
  focusedRoundNumber: number;
  isOwner: boolean;
  jobId?: string | null;
  overallScore: number | null;
  preferredName: string | null;
  rounds: PublicRoundData[];
  user?: {
    email: string | null;
    name: string | null;
  };
};

export function PublicDiagnosticReport({
  backHref,
  backLabel,
  bandConfig,
  focusedRoundNumber,
  isOwner,
  jobId,
  overallScore,
  preferredName: _preferredName,
  rounds,
  user,
}: PublicDiagnosticReportProps) {
  const [activeRoundNumber, setActiveRoundNumber] =
    useState(focusedRoundNumber);

  const activeRound = rounds.find((r) => r.roundNumber === activeRoundNumber);

  return (
    <>
      {user ? (
        <ReportHeader backHref={backHref} backLabel={backLabel} user={user} />
      ) : null}
      <main className="min-h-dvh bg-lavender md:pb-10">
        <div className="mx-auto w-full max-w-4xl space-y-6 md:py-8">
          <DiagnosticsJobHeader
            bandConfig={bandConfig}
            overallScore={overallScore}
          />

          <section className="px-5 space-y-4 pb-8 md:px-0">
            <RoundTabs
              activeRoundNumber={activeRoundNumber}
              rounds={rounds}
              onSelect={setActiveRoundNumber}
            />

            {activeRound?.hasReport ? (
              <RoundDetailView round={activeRound} />
            ) : activeRound ? (
              <RoundStartCard round={activeRound} isOwner={isOwner} jobId={jobId} />
            ) : null}
          </section>
        </div>
      </main>
    </>
  );
}

function getUserInitial(user: { email: string | null; name: string | null }) {
  const source = user.name?.trim() || user.email?.trim() || "U";
  return source.charAt(0).toUpperCase();
}

function ReportHeader({
  backHref,
  backLabel,
  user,
}: {
  backHref?: string;
  backLabel?: string;
  user: { email: string | null; name: string | null };
}) {
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push("/login"),
      },
    });
  }

  return (
    <header className="bg-white shadow">
      <div className="flex items-center justify-between gap-4 px-2 py-2">
        <div className="flex min-w-0 items-center gap-3">
          {backHref ? (
            <Link
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-foreground transition hover:bg-muted"
              href={backHref}
              aria-label={backLabel ?? "Back"}
            >
              <ArrowLeft className="size-4" />
            </Link>
          ) : null}
          <h1 className="min-w-0 truncate text-base font-semibold tracking-tight text-foreground">
            Diagnostic Report
          </h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-[#4D7ED8] bg-[#4D7ED8] text-lg font-semibold text-white shadow-[inset_0_0_0_3px_white] transition hover:bg-[#416FC1] md:size-12"
            type="button"
          >
            {getUserInitial(user)}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
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
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="grid grid-cols-4 p-2 md:gap-x-2">
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
          return (
            <div className="w-full" key={round.roundNumber}>
              <button
                className={cn(
                  "ring-2 ring-inset ring-transparent w-full flex flex-col items-center gap-2 px-2 py-4 text-center transition p-4 rounded-lg",
                  isActive && "ring-[#6C47FF] bg-[#F6F3FF]",
                )}
                type="button"
                onClick={() => onSelect(round.roundNumber)}
              >
                <RoundTabIcon hasReport={round.hasReport} />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Round {round.roundNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">{shortTitle}</p>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoundTabIcon({ hasReport }: { hasReport: boolean }) {
  if (hasReport) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(180deg,#3DD24A_0%,#00B400_100%)]">
        <Check className="h-5 w-5 text-white" />
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#6C47FF] bg-white">
      <Play className="h-4 w-4 fill-[#6C47FF]" />
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
  const score = Math.round(assessment.total_score);

  const { label: performanceLabel, color: performanceColor } =
    getPerformanceBadge(score);

  const config = DIAGNOSTIC_ROUNDS[round.roundNumber - 1];
  const roundName = config?.title ?? `Round ${round.roundNumber}`;

  return (
    <div className="space-y-4">
      <FeedbackCard
        improvements={report.improvement_areas}
        performanceColor={performanceColor}
        performanceLabel={performanceLabel}
        roundName={roundName}
        roundNumber={round.roundNumber}
        strengths={report.strengths}
      />

      <QuestionWiseAnalysis responses={assessment.question_responses} />
    </div>
  );
}

function FeedbackCard({
  improvements,
  performanceColor,
  performanceLabel,
  roundName,
  roundNumber,
  strengths,
}: {
  improvements: string[];
  performanceColor: string;
  performanceLabel: string;
  roundName: string;
  roundNumber: number;
  strengths: string[];
}) {
  if (strengths.length === 0 && improvements.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-foreground">
          Round {roundNumber} - {roundName}
        </h3>
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold text-white"
          style={{ backgroundColor: performanceColor }}
        >
          {performanceLabel}
        </span>
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
    if (level) scores.push(THINKING_SCORE_MAP[level as DiagnosticThinkingLevel]);
  }
  for (const [, level] of Object.entries(response.language_levels ?? {})) {
    if (level) scores.push(LANGUAGE_SCORE_MAP[level as DiagnosticLanguageLevel]);
  }

  if (!scores.length) return 3;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function getWeakDimensions(response: DiagnosticQuestionResponse): WeakDimension[] {
  const weak: WeakDimension[] = [];

  for (const [dim, level] of Object.entries(response.thinking_levels ?? {})) {
    const score = level ? THINKING_SCORE_MAP[level as DiagnosticThinkingLevel] : null;
    if (score !== null && score <= 2) {
      const feedback = response.reasoning.thinking?.[dim as DiagnosticThinkingDimension];
      if (feedback) {
        weak.push({
          label: THINKING_DIMENSION_LABELS[dim as DiagnosticThinkingDimension],
          feedback,
        });
      }
    }
  }

  for (const [dim, level] of Object.entries(response.language_levels ?? {})) {
    const score = level ? LANGUAGE_SCORE_MAP[level as DiagnosticLanguageLevel] : null;
    if (score !== null && score <= 2) {
      const feedback = response.reasoning.language?.[dim as DiagnosticLanguageDimension];
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
    <Accordion className="gap-4" defaultValue={["question-analysis"]}>
      <AccordionItem
        className="overflow-hidden rounded-2xl border border-border shadow-sm"
        value="question-analysis"
      >
        <AccordionTrigger className="p-4 text-left hover:no-underline">
          <span className="text-base font-bold text-foreground">
            Question wise analysis
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 bg-[#F0EFF2] px-4 pb-4">
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
    <div className="space-y-3 pt-4 first:pt-0">
      {/* Agent message — white bubble, left-aligned */}
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-2xl bg-white px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">Sara</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-foreground">
            {response.question_text}
          </p>
        </div>
      </div>

      {/* User message — right-aligned, two parts */}
      {response.candidate_answer && (
        <div className="flex flex-col items-end gap-2">
          {/* Actual answer */}
          <div className="max-w-[85%] rounded-2xl bg-[#6C47FF] px-4 py-3">
            <p className="text-sm leading-6 text-white">
              {response.candidate_answer}
            </p>
          </div>

          {/* Feedback + reframed answer */}
          <div className="max-w-[85%] space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Feedback
              </p>
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                Needs work
              </span>
            </div>

            {response.reframed_answer ? (
              <div className="rounded-xl bg-[#FEF9E7] px-4 py-3">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span aria-hidden="true">✨</span>
                  <p className="text-xs font-semibold text-foreground">
                    Reframed Answer
                  </p>
                </div>
                <p className="text-sm leading-6 text-[#6B6B72]">
                  {response.reframed_answer}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {weakDimensions.map(({ label, feedback }) => (
                  <div key={label} className="rounded-xl bg-white px-4 py-3">
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

      {config && (
        <div className="mt-4 grid items-end gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-[#6B6B7A]">
              Questions may cover
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {config.questions.map((question) => (
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
              router.push(jobId ? `/jobs/${jobId}/prejoin?round=${round.roundType}` : "/jobs");
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
