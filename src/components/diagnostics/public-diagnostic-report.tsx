"use client";

import {
  ArrowLeft,
  Brain,
  Check,
  Info,
  Languages,
  Lightbulb,
  Lock,
  type LucideIcon,
  Play,
  Smile,
  Target,
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
import { authClient } from "@/lib/auth-client";
import type { DiagnosticBandConfig } from "@/lib/diagnostics/bands-config";
import { DIAGNOSTIC_ROUNDS } from "@/lib/diagnostics/rounds-config";
import type {
  DiagnosticConfidenceDimension,
  DiagnosticConfidenceLevel,
  DiagnosticLanguageDimension,
  DiagnosticLanguageLevel,
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
    };

export type PublicDiagnosticReportProps = {
  backHref?: string;
  backLabel?: string;
  bandConfig: DiagnosticBandConfig | undefined;
  currentRound: number;
  focusedRoundNumber: number;
  isOwner: boolean;
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
  currentRound,
  focusedRoundNumber,
  isOwner,
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
          {/* Job Header Card */}
          <DiagnosticsJobHeader
            bandConfig={bandConfig}
            overallScore={overallScore}
          />

          <section className="px-5 space-y-4 pb-8 md:px-0">
            {/* Round Tabs */}
            <RoundTabs
              activeRoundNumber={activeRoundNumber}
              currentRound={currentRound}
              isOwner={isOwner}
              rounds={rounds}
              onSelect={setActiveRoundNumber}
            />

            {/* Round Detail */}
            {activeRound?.hasReport ? (
              <RoundDetailView round={activeRound} />
            ) : activeRound &&
              isOwner &&
              activeRound.roundNumber === currentRound ? (
              <RoundStartCard round={activeRound} />
            ) : activeRound ? (
              <LockedRoundPlaceholder round={activeRound} />
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
  currentRound,
  isOwner,
  rounds,
  onSelect,
}: {
  activeRoundNumber: number;
  currentRound: number;
  isOwner: boolean;
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
          const isEnabled =
            round.hasReport || (isOwner && round.roundNumber === currentRound);
          const isNext =
            !round.hasReport && isOwner && round.roundNumber === currentRound;

          return (
            <div className="w-full" key={round.roundNumber}>
              <button
                className={cn(
                  "ring-2 ring-inset ring-transparent w-full flex flex-col items-center gap-2 px-2 py-4 text-center transition p-4 rounded-lg",
                  isActive && "ring-[#6C47FF] bg-[#F6F3FF]",
                  !isEnabled &&
                    "cursor-not-allowed opacity-60 pointer-events-none",
                )}
                disabled={!isEnabled}
                type="button"
                onClick={() => isEnabled && onSelect(round.roundNumber)}
              >
                <RoundTabIcon
                  isActive={isActive}
                  isEnabled={isEnabled}
                  isNext={isNext}
                />
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

function RoundTabIcon({
  isActive,
  isEnabled,
  isNext,
}: {
  isActive: boolean;
  isEnabled: boolean;
  isNext: boolean;
}) {
  if (isEnabled && !isNext) {
    return (
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(180deg,#3DD24A_0%,#00B400_100%)]",
        )}
      >
        <Check className="h-5 w-5 text-white" />
      </div>
    );
  }

  if (isNext) {
    return (
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#6C47FF] bg-white",
        )}
      >
        <Play className="h-4 w-4 fill-[#6C47FF]" />
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-muted-foreground/50 bg-muted text-muted-foreground">
      <Lock className="h-4 w-4" />
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

      <SkillsReport assessment={assessment} />
    </div>
  );
}

function RoundStartCard({ round }: { round: PublicRoundData }) {
  const router = useRouter();
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
            type="button"
            onClick={() =>
              router.push(`/diagnostics/prejoin?round=${round.roundType}`)
            }
          >
            <Play className="mr-1 size-3 fill-current" />
            Start Round {round.roundNumber}
          </button>
        </div>
      )}
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

function SkillsReport({
  assessment,
}: {
  assessment: DiagnosticReportJson["assessment_result"];
}) {
  const skills = buildSkillSummaries(assessment);

  return (
    <div className="space-y-4">
      <h4 className="text-2xl font-bold tracking-tight text-foreground">
        Skills Report
      </h4>
      <Accordion className="gap-4" defaultValue={[skills[0]?.id ?? "thinking"]}>
        {skills.map((skill) => (
          <SkillAccordionItem key={skill.id} skill={skill} />
        ))}
      </Accordion>
    </div>
  );
}

type SkillDimensionSummary = {
  label: string;
  levelLabel: string;
  score: number;
  reasoning: string;
};

type SkillSummary = {
  id: string;
  icon: LucideIcon;
  label: string;
  level: number;
  strong: SkillDimensionSummary[];
  improve: SkillDimensionSummary[];
};

function SkillAccordionItem({ skill }: { skill: SkillSummary }) {
  const { label: levelLabel, tone } = getSkillLevel(skill.level);
  const Icon = skill.icon;

  const toneClasses: Record<string, string> = {
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-orange-100 text-orange-600",
    red: "bg-red-100 text-red-600",
  };

  return (
    <AccordionItem
      className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm not-last:border-b-0"
      value={skill.id}
    >
      <AccordionTrigger className="items-center px-4 py-5 text-left hover:no-underline md:px-5">
        <div className="flex items-center gap-4">
          <div className="flex size-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Icon className="size-4" />
          </div>
          <span className="text-lg font-bold text-foreground">
            {skill.label}
          </span>
        </div>
        <span
          className={cn(
            "mr-5 rounded-full px-4 py-2 text-sm font-bold",
            toneClasses[tone],
          )}
        >
          {levelLabel}
        </span>
      </AccordionTrigger>
      <AccordionContent className="space-y-4 px-4 pb-5 md:px-5">
        <DimensionSection
          emptyText="No strong dimensions yet."
          items={skill.strong}
          title="Strong skills"
          tone="strong"
        />
        <DimensionSection
          emptyText="No priority improvement dimensions."
          items={skill.improve}
          title="Areas to improve"
          tone="improve"
        />
      </AccordionContent>
    </AccordionItem>
  );
}

function DimensionSection({
  emptyText,
  items,
  title,
  tone,
}: {
  emptyText: string;
  items: SkillDimensionSummary[];
  title: string;
  tone: "strong" | "improve";
}) {
  return (
    <section
      className={cn(
        "rounded-2xl p-5",
        tone === "strong" ? "bg-emerald-50" : "bg-red-50",
      )}
    >
      <h5 className="text-lg font-bold text-foreground">{title}</h5>
      {items.length ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <DimensionCard item={item} key={item.label} tone={tone} />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{emptyText}</p>
      )}
    </section>
  );
}

function DimensionCard({
  item,
  tone,
}: {
  item: SkillDimensionSummary;
  tone: "strong" | "improve";
}) {
  const Icon = tone === "strong" ? Target : Lightbulb;

  return (
    <article className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-6 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h6 className="text-base font-bold text-foreground">
              {item.label}
            </h6>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {item.levelLabel}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {item.reasoning}
          </p>
        </div>
      </div>
    </article>
  );
}

const THINKING_DIMENSION_LABELS: Record<DiagnosticThinkingDimension, string> = {
  Relevance: "Relevance",
  Specificity: "Specificity",
  Reasoning: "Reasoning",
  JobCompetency: "Job competency",
};

const CONFIDENCE_DIMENSION_LABELS: Record<
  DiagnosticConfidenceDimension,
  string
> = {
  Volume: "Volume",
  Pace: "Pace",
  Pause: "Pause",
  Latency: "Latency",
};

const LANGUAGE_DIMENSION_LABELS: Record<DiagnosticLanguageDimension, string> = {
  Fluency: "Fluency",
  Grammar: "Grammar",
  Range: "Range",
  Coherence: "Coherence",
  Interaction: "Interaction",
};

const THINKING_SCORE_MAP: Record<DiagnosticThinkingLevel, number> = {
  TF1: 1,
  TF2: 2,
  TF3: 3,
  TF4: 4,
  TF5: 5,
};

const CONFIDENCE_SCORE_MAP: Record<DiagnosticConfidenceLevel, number> = {
  VCP1: 1,
  VCP2: 2,
  VCP3: 3,
  VCP4: 4,
};

const LANGUAGE_SCORE_MAP: Record<DiagnosticLanguageLevel, number> = {
  "Pre-A1": 1,
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 5,
};

function buildSkillSummaries(
  assessment: DiagnosticReportJson["assessment_result"],
): SkillSummary[] {
  return [
    {
      id: "thinking",
      icon: Brain,
      label: "Thinking",
      level: assessment.thinking_avg,
      ...splitDimensions(
        buildThinkingDimensions(assessment.question_responses),
      ),
    },
    {
      id: "language",
      icon: Languages,
      label: "Language",
      level: assessment.language_avg,
      ...splitDimensions(
        buildLanguageDimensions(assessment.question_responses),
      ),
    },
    {
      id: "confidence",
      icon: Smile,
      label: "Confidence",
      level: assessment.confidence_avg,
      ...splitDimensions(
        buildConfidenceDimensions(assessment.question_responses),
      ),
    },
  ];
}

function splitDimensions(items: SkillDimensionSummary[]) {
  return {
    strong: items.filter((item) => item.score >= 4),
    improve: items.filter((item) => item.score <= 3),
  };
}

function buildThinkingDimensions(
  responses: DiagnosticReportJson["assessment_result"]["question_responses"],
) {
  return (
    Object.keys(THINKING_DIMENSION_LABELS) as DiagnosticThinkingDimension[]
  ).flatMap((dimension): SkillDimensionSummary[] => {
    const levels = responses
      .map((response) => response.thinking_levels?.[dimension])
      .filter((level): level is DiagnosticThinkingLevel => Boolean(level));
    const level = conservativeMode(levels, THINKING_SCORE_MAP);
    if (!level) return [];
    return [
      {
        label: THINKING_DIMENSION_LABELS[dimension],
        levelLabel: level,
        score: THINKING_SCORE_MAP[level],
        reasoning: getFirstReasoning(
          responses.map((response) => response.reasoning.thinking?.[dimension]),
        ),
      },
    ];
  });
}

function buildConfidenceDimensions(
  responses: DiagnosticReportJson["assessment_result"]["question_responses"],
) {
  return (
    Object.keys(CONFIDENCE_DIMENSION_LABELS) as DiagnosticConfidenceDimension[]
  ).flatMap((dimension): SkillDimensionSummary[] => {
    const levels = responses
      .map((response) => response.confidence_levels?.[dimension])
      .filter((level): level is DiagnosticConfidenceLevel => Boolean(level));
    const level = conservativeMode(levels, CONFIDENCE_SCORE_MAP);
    if (!level) return [];
    return [
      {
        label: CONFIDENCE_DIMENSION_LABELS[dimension],
        levelLabel: level,
        score: CONFIDENCE_SCORE_MAP[level],
        reasoning: getFirstReasoning(
          responses.map(
            (response) => response.reasoning.confidence?.[dimension],
          ),
        ),
      },
    ];
  });
}

function buildLanguageDimensions(
  responses: DiagnosticReportJson["assessment_result"]["question_responses"],
) {
  return (
    Object.keys(LANGUAGE_DIMENSION_LABELS) as DiagnosticLanguageDimension[]
  ).flatMap((dimension): SkillDimensionSummary[] => {
    const levels = responses
      .map((response) => response.language_levels?.[dimension])
      .filter((level): level is DiagnosticLanguageLevel => Boolean(level));
    const level = conservativeMode(levels, LANGUAGE_SCORE_MAP);
    if (!level) return [];
    return [
      {
        label: LANGUAGE_DIMENSION_LABELS[dimension],
        levelLabel: level,
        score: LANGUAGE_SCORE_MAP[level],
        reasoning: getFirstReasoning(
          responses.map((response) => response.reasoning.language?.[dimension]),
        ),
      },
    ];
  });
}

function conservativeMode<Level extends string>(
  levels: Level[],
  scoreMap: Record<Level, number>,
) {
  if (!levels.length) return null;

  const counts = new Map<Level, number>();
  for (const level of levels) {
    counts.set(level, (counts.get(level) ?? 0) + 1);
  }

  const maxCount = Math.max(...counts.values());
  return Array.from(counts.entries())
    .filter(([, count]) => count === maxCount)
    .map(([level]) => level)
    .sort((left, right) => scoreMap[left] - scoreMap[right])[0];
}

function getFirstReasoning(values: Array<string | undefined>) {
  return (
    values.find((value) => value?.trim()) ??
    "No written explanation was captured for this dimension."
  );
}

function LockedRoundPlaceholder({
  round,
}: {
  round: PublicRoundData & { hasReport: false };
}) {
  const config = DIAGNOSTIC_ROUNDS[round.roundNumber - 1];
  const roundName = config?.title ?? `Round ${round.roundNumber}`;

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-white p-10 text-center shadow-sm">
      <Lock className="h-8 w-8 text-muted-foreground/40" />
      <p className="mt-3 text-sm font-medium text-muted-foreground">
        Round {round.roundNumber} - {roundName}
      </p>
      <p className="mt-1 text-xs text-muted-foreground/70">
        This round report is not available yet.
      </p>
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

function getSkillLevel(value: number): {
  label: string;
  tone: "green" | "amber" | "red";
} {
  if (value >= 80) return { label: "HIGH", tone: "green" };
  if (value >= 50) return { label: "MID", tone: "amber" };
  return { label: "LOW", tone: "red" };
}
