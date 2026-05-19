"use client";

import {
  Brain,
  Check,
  Info,
  Languages,
  Lock,
  type LucideIcon,
  Play,
  Smile,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DiagnosticsJobHeader } from "@/components/diagnostics/diagnostics-job-header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { authClient } from "@/lib/auth-client";
import type { DiagnosticBandConfig } from "@/lib/diagnostics/bands-config";
import type { DiagnosticsHydratedReport } from "@/lib/diagnostics/report-schema";
import { DIAGNOSTIC_ROUNDS } from "@/lib/diagnostics/rounds-config";
import { cn } from "@/lib/utils";

export type PublicRoundData =
  | {
      roundNumber: number;
      roundType: string;
      roundTitle: string;
      hasReport: true;
      shareToken: string | null;
      report: DiagnosticsHydratedReport;
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
      {user ? <ReportHeader user={user} /> : null}
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
  user,
}: {
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
      <div className="flex items-center justify-between gap-4 px-3 py-2 md:px-8">
        <h1 className="min-w-0 truncate text-base font-semibold tracking-tight text-foreground">
          Diagnostic Report
        </h1>
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
                  isActive && "ring-emerald-400 bg-emerald-50",
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
          isActive && "ring-2 ring-emerald-600/20",
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
          "flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#6C47FF] bg-[#6C47FF] text-white",
          isActive && "ring-2 ring-[#6C47FF]/20",
        )}
      >
        <Play className="h-4 w-4 fill-current" />
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

      {/* Skills Report */}
      <div className="space-y-3">
        <h4 className="text-base font-bold text-foreground">Skills Report</h4>
        <ItemGroup className="gap-3">
          <SkillItem
            iconClassName="bg-emerald-100 text-emerald-700"
            description={assessment.thinking_reasoning}
            icon={Brain}
            label="Thinking"
            level={assessment.thinking_avg}
            meta={assessment.thinking_level}
          />
          <SkillItem
            iconClassName="bg-blue-100 text-blue-700"
            description={Object.entries(assessment.language_reasoning)
              .map(([dimension, reasoning]) => `${dimension}: ${reasoning}`)
              .join(" ")}
            icon={Languages}
            label="Language"
            level={assessment.language_avg}
            meta={Object.entries(assessment.language_levels)
              .map(([dimension, level]) => `${dimension} ${level}`)
              .join(" · ")}
          />
          <SkillItem
            iconClassName="bg-yellow-100 text-yellow-700"
            description={assessment.confidence_reasoning}
            icon={Smile}
            label="Confidence"
            level={assessment.confidence_avg}
            meta={assessment.confidence_level}
          />
        </ItemGroup>
      </div>
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

function SkillItem({
  icon,
  iconClassName,
  label,
  level,
}: {
  description: string;
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  level: number;
  meta: string;
}) {
  const { label: levelLabel, tone } = getSkillLevel(level);
  const Icon = icon;

  const toneClasses: Record<string, string> = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <Item variant="outline" className="rounded-xl bg-white shadow-sm">
      <ItemMedia
        variant="icon"
        className={cn("h-9 w-9 rounded-full", iconClassName)}
      >
        <Icon className="h-4 w-4" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{label}</ItemTitle>
      </ItemContent>
      <ItemActions>
        <span
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold",
            toneClasses[tone],
          )}
        >
          {levelLabel}
        </span>
      </ItemActions>
    </Item>
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
