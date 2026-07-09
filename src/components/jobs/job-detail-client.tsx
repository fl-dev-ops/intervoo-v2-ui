"use client";

import {
  IconCodeAsterisk,
  IconEyeSearch,
  IconUserCheck,
  IconUsersGroup,
} from "@tabler/icons-react";
import {
  ArrowLeft,
  CheckIcon,
  CircleAlert,
  CloudUpload,
  LoaderCircle,
  Play,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { AddSkillsDialog } from "@/components/jobs/add-skills-dialog";
import { ChangeResumeDialog } from "@/components/jobs/change-resume-dialog";
import { JobDetailCard } from "@/components/jobs/job-detail-card";
import { DiagnosticUnlockDialog } from "@/components/payments/diagnostic-unlock-dialog";
import { Button } from "@/components/ui/button";
import { useRoundStatus } from "@/hooks/jobs/hooks";
import {
  DIAGNOSTIC_ROUNDS,
  type DiagnosticRoundConfig,
} from "@/lib/diagnostics/rounds-config";
import type { JobDetail } from "@/lib/jd-client";
import { cn } from "@/lib/utils";

type DetailStep = "match-details" | "round-list";

type JobDetailClientProps = {
  job: JobDetail;
  readyRoundIds?: string[];
  processingRoundIds?: string[];
  roundScores?: Record<string, number | null>;
  diagnosticId?: string | null;
  overallScore?: number | null;
  paymentReason?: string;
  requiresPayment?: boolean;
  user: { email: string | null; name: string | null };
};

export function JobDetailClient({
  job,
  readyRoundIds = [],
  processingRoundIds = [],
  roundScores = {},
  diagnosticId,
  overallScore,
  paymentReason,
  requiresPayment = false,
  user,
}: JobDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStepState] = useState<DetailStep>(() =>
    getDetailStep(searchParams.get("step")),
  );
  const [startingRoundId, setStartingRoundId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localReadyRoundIds, setLocalReadyRoundIds] = useState(readyRoundIds);
  const [localProcessingRoundIds, setLocalProcessingRoundIds] =
    useState(processingRoundIds);
  const [localRoundScores, setLocalRoundScores] = useState(roundScores);
  const [isAddSkillsOpen, setIsAddSkillsOpen] = useState(false);
  const [isChangeResumeOpen, setIsChangeResumeOpen] = useState(false);
  const [dialogJobSkills, setDialogJobSkills] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const rounds = DIAGNOSTIC_ROUNDS.map((round, index) => ({
    ...round,
    isReportReady: localReadyRoundIds.includes(round.id),
    isReportProcessing: localProcessingRoundIds.includes(round.id),
    score: localRoundScores[round.id] ?? null,
    questions: job.rounds[index]?.competencies?.length
      ? job.rounds[index].competencies
      : round.questions,
  }));
  const activeRoundIndex = Math.max(
    rounds.findIndex(
      (round) => !round.isReportReady && !round.isReportProcessing,
    ),
    0,
  );
  const hasCompletedRound =
    localReadyRoundIds.length > 0 || localProcessingRoundIds.length > 0;
  const isPracticeComplete = localReadyRoundIds.length >= rounds.length;

  useEffect(() => {
    setLocalReadyRoundIds(readyRoundIds);
    setLocalProcessingRoundIds(processingRoundIds);
    setLocalRoundScores(roundScores);
  }, [processingRoundIds, readyRoundIds, roundScores]);

  useEffect(() => {
    if (searchParams.get("step")) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", "match-details");
    window.history.replaceState(
      null,
      "",
      `/jobs/${job.jobId}?${params.toString()}`,
    );
  }, [job.jobId, searchParams]);

  // Poll round status while a report is still generating; the query stops
  // itself once nothing is processing. Seeded with the server-rendered state.
  const roundStatusQuery = useRoundStatus(job.jobId, {
    enabled: localProcessingRoundIds.length > 0,
    initialData: { readyRoundIds, processingRoundIds, roundScores },
  });

  // Mirror polled status into local state so the CTA flips to "View Report"
  // once a report is ready.
  useEffect(() => {
    const status = roundStatusQuery.data;
    if (!status) return;
    setLocalReadyRoundIds(status.readyRoundIds);
    setLocalProcessingRoundIds(status.processingRoundIds);
    setLocalRoundScores(status.roundScores);
  }, [roundStatusQuery.data]);

  async function handleStart(roundId: string) {
    if (startingRoundId) return;
    setStartingRoundId(roundId);
    setError(null);

    try {
      router.push(`/jobs/${job.jobId}/prejoin?round=${roundId}`);
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : "Failed to start diagnostics.",
      );
      setStartingRoundId(null);
    }
  }

  function setStep(nextStep: DetailStep) {
    setStepState(nextStep);
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", nextStep);
    window.history.replaceState(
      null,
      "",
      `/jobs/${job.jobId}?${params.toString()}`,
    );
  }

  return (
    <main className="min-h-dvh bg-[#F6F3F8] font-sans text-black">
      <AppHeader user={user} />
      <section className="mx-auto w-full max-w-225 px-4 pb-14 pt-6">
        {(!hasCompletedRound || step === "round-list") && (
          <button
            type="button"
            onClick={() =>
              step === "round-list"
                ? setStep("match-details")
                : router.push("/jobs")
            }
            className="inline-flex items-center gap-2 text-base font-semibold text-black"
          >
            <ArrowLeft className="size-5" />
            Back
          </button>
        )}

        {step === "match-details" ? (
          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-[#E9DFB7] bg-[#FFFDF0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-3 text-base text-[#706B7A]">
              <CircleAlert className="size-5 shrink-0 fill-[#B6A234] text-[#B6A234] stroke-white" />
              Do you feel this info doesn&apos;t match to your Resume?
            </p>
            <Button
              className="shrink-0"
              onClick={() => setIsChangeResumeOpen(true)}
              type="button"
              variant="secondary"
            >
              <CloudUpload />
              Change my Resume
            </Button>
          </div>
        ) : null}

        <div className={step === "match-details" ? "mt-4" : "mt-8"}>
          <JobDetailCard
            companyName={job.companyName}
            description={job.roleSummary ?? undefined}
            experience={formatExperienceLabel(
              job.experienceMinYears,
              job.experienceMaxYears,
            )}
            jobId={step === "match-details" ? job.jobId : undefined}
            location={job.location}
            onAddSkills={(jobSkills) => {
              setDialogJobSkills(jobSkills);
              setIsAddSkillsOpen(true);
            }}
            onStartInterview={
              step === "match-details" ? () => setStep("round-list") : undefined
            }
            overallScore={overallScore}
            refreshKey={refreshKey}
            roundCount={rounds.length}
            salary={formatSalaryRange(
              job.salaryInrMinPerYear,
              job.salaryInrMaxPerYear,
            )}
            showFitDetails={step === "match-details"}
            sourceUrl={job.sourceUrl}
            skills={step === "match-details" ? job.requiredSkills : undefined}
            jobTitle={job.jobTitle}
            workMode={job.workMode}
          />
        </div>

        <AddSkillsDialog
          jobSkills={dialogJobSkills}
          onOpenChange={setIsAddSkillsOpen}
          onSaved={() => {
            setRefreshKey((k) => k + 1);
            router.refresh();
          }}
          open={isAddSkillsOpen}
        />

        <ChangeResumeDialog
          onOpenChange={setIsChangeResumeOpen}
          open={isChangeResumeOpen}
        />

        {isPracticeComplete && diagnosticId ? (
          <div className="mt-4 rounded-2xl bg-white px-5 py-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-base font-bold text-black">
                  All rounds completed
                </p>
                <p className="mt-1 text-sm text-[#6D6873]">
                  View your final report or start practice for another JD.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  className="rounded-full bg-button px-5 text-sm font-bold text-white"
                  type="button"
                  onClick={() => router.push(`/report/${diagnosticId}`)}
                >
                  View final report
                </Button>
                <Button
                  className="rounded-full border-[#6C47FF] bg-white px-5 text-sm font-bold text-[#5E41CF] hover:bg-[#F6F3FF]"
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/jobs")}
                >
                  Start new practice
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {step === "round-list" ? (
          <div className="mt-7 w-full rounded-t-3xl bg-[linear-gradient(180deg,#0B061E_0%,#3C2390_100%)] p-5 md:rounded-b-3xl md:p-8">
            <div className="space-y-3">
              {rounds.map((round, index) => {
                const roundNumber = index + 1;
                const isActive = index === activeRoundIndex;
                const isDone = round.isReportReady;
                const isProcessing = round.isReportProcessing;
                // Lock all rounds at or beyond the paywall
                const isLocked =
                  requiresPayment &&
                  index >= activeRoundIndex &&
                  !isDone &&
                  !isProcessing;
                return (
                  <RoundTimelineItem
                    key={round.id}
                    config={round}
                    diagnosticId={diagnosticId}
                    isCurrent={isActive}
                    isDone={isDone}
                    isLast={isLast(index, rounds.length)}
                    isLocked={isLocked}
                    isProcessing={isProcessing}
                    jobId={job.jobId}
                    completedRoundIds={localReadyRoundIds}
                    paymentReason={paymentReason}
                    questions={round.questions}
                    requiresPayment={requiresPayment && isActive}
                    roundNumber={roundNumber}
                    score={round.score}
                    startingRoundId={startingRoundId}
                    onStart={() => handleStart(round.id)}
                    onViewReport={() => router.push(`/report/${diagnosticId}`)}
                  />
                );
              })}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 w-full rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function getDetailStep(step: string | null): DetailStep {
  if (step === "round-list" || step === "2") return "round-list";
  return "match-details";
}

function RoundTimelineItem({
  config,
  diagnosticId,
  isCurrent,
  isDone,
  isLast,
  isLocked,
  isProcessing,
  jobId,
  completedRoundIds,
  onStart,
  onViewReport,
  paymentReason,
  questions,
  requiresPayment,
  roundNumber,
  score,
  startingRoundId,
}: {
  config: DiagnosticRoundConfig;
  diagnosticId?: string | null;
  isCurrent: boolean;
  isDone: boolean;
  isLast: boolean;
  isLocked: boolean;
  isProcessing: boolean;
  jobId: string;
  completedRoundIds: string[];
  onStart: () => void;
  onViewReport: () => void;
  paymentReason?: string;
  questions: string[];
  requiresPayment: boolean;
  roundNumber: number;
  score: number | null;
  startingRoundId: string | null;
}) {
  const isActiveCard = isCurrent && !isProcessing;
  const showQuestions = (isActiveCard || isProcessing) && !isDone;

  return (
    <article className="relative grid grid-cols-[3rem_1fr] gap-x-2 gap-y-2 md:gap-x-4 md:gap-y-0">
      <div className="flex items-center justify-center">
        <RoundStateIcon config={config} isCurrent={isCurrent} isDone={isDone} />
      </div>

      <div className="flex min-w-0 items-center justify-between gap-3">
        <span
          className={cn(
            "text-xs font-semibold uppercase tracking-[0.12em]",
            isActiveCard || isProcessing
              ? "text-purple-400"
              : isDone
                ? "text-emerald-400"
                : "text-white/40",
          )}
        >
          ROUND {roundNumber}
        </span>
        {isDone ? (
          <RoundResultBadge score={score} />
        ) : (
          <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-white">
            {config.duration}
          </span>
        )}
      </div>

      <div className="hidden justify-center md:flex">
        {!isLast && (
          <div
            className={cn(
              "hidden h-full min-h-28 w-1 rounded-full md:block",
              isActiveCard
                ? "bg-[linear-gradient(180deg,rgba(108,71,255,0.75)_0%,rgba(0,180,0,0)_100%)]"
                : isDone
                  ? "bg-[linear-gradient(180deg,rgba(61,210,74,0.75)_0%,rgba(0,180,0,0)_100%)]"
                  : "bg-[linear-gradient(180deg,rgba(255,255,255,0.24)_0%,rgba(255,255,255,0)_100%)]",
            )}
          />
        )}
      </div>

      <div className="col-span-2 min-w-0 pb-6 md:col-span-1">
        <div
          className={cn(
            "rounded-2xl border p-5 transition",
            isActiveCard
              ? "border-white/10 bg-white shadow-sm"
              : "border-white/10 bg-white/10",
          )}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h2
                className={cn(
                  "text-lg font-semibold tracking-tight",
                  isActiveCard ? "text-foreground" : "text-white/80",
                )}
              >
                {config.title}
              </h2>
              <p
                className={cn(
                  "mt-2 max-w-3xl text-sm leading-6",
                  isActiveCard ? "text-muted-foreground" : "text-white/50",
                )}
              >
                {config.description}
              </p>
              {isProcessing ? (
                <p className="mt-3 text-sm font-medium text-white/80">
                  Calculating your report
                </p>
              ) : null}
            </div>

            {isDone && diagnosticId ? (
              <div className="flex shrink-0 justify-end">
                <Button
                  className="h-10 rounded-full border-[#9C83FF]/40 bg-transparent px-5 text-[#9C83FF] hover:bg-[#9C83FF]/10 hover:text-[#B6A5FF]"
                  onClick={onViewReport}
                  type="button"
                  variant="outline"
                >
                  View report
                </Button>
              </div>
            ) : null}
          </div>

          {showQuestions ? (
            <div className="grid items-end gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <p
                  className={cn(
                    "mt-4 text-sm font-medium",
                    isActiveCard ? "text-[#6B6B7A]" : "text-white/60",
                  )}
                >
                  Questions may cover
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {questions.map((question) => (
                    <span
                      key={question}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs",
                        isActiveCard
                          ? "border-border bg-muted/50 text-gray-600"
                          : "border-white/15 bg-white/10 text-white/70",
                      )}
                    >
                      {question}
                    </span>
                  ))}
                </div>
              </div>

              {requiresPayment && diagnosticId ? (
                <div className="col-span-2 space-y-2 md:col-span-1 md:ml-auto">
                  <DiagnosticUnlockDialog
                    className="w-full rounded-full border-0 bg-button px-10 py-6 shadow-none"
                    completedRoundIds={completedRoundIds}
                    diagnosticId={diagnosticId}
                    jobId={jobId}
                  />
                  <p
                    className={cn(
                      "text-center text-xs font-medium",
                      isActiveCard ? "text-[#6B6B7A]" : "text-white/60",
                    )}
                  >
                    {paymentReason === "PAYMENT_REQUIRED"
                      ? "Unlock all rounds for this JD."
                      : "Payment required to continue."}
                  </p>
                </div>
              ) : isProcessing ? (
                <span className="col-span-2 flex items-center justify-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-10 py-6 text-xs font-medium text-purple-700 md:col-span-1 md:ml-auto">
                  <LoaderCircle className="size-4 animate-spin" />
                  Report processing
                </span>
              ) : !isLocked ? (
                <Button
                  className="col-span-2 w-full rounded-full border-0 bg-button px-10 py-6 shadow-none md:col-span-1 md:ml-auto"
                  disabled={Boolean(startingRoundId)}
                  size="lg"
                  type="button"
                  onClick={onStart}
                >
                  {startingRoundId === config.id ? (
                    <>
                      <LoaderCircle className="mr-1 size-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="mr-1 size-3 fill-current" />
                      Start Round {roundNumber}
                    </>
                  )}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function RoundStateIcon({
  config,
  isCurrent,
  isDone,
}: {
  config: DiagnosticRoundConfig;
  isCurrent: boolean;
  isDone: boolean;
}) {
  const Icon = getRoundIcon(config.id);

  return (
    <div
      className={cn(
        "relative z-10 flex size-10 items-center justify-center rounded-full border-2 md:size-12",
        isDone
          ? "border-emerald-500 bg-[linear-gradient(180deg,#3DD24A_0%,#00B400_100%)] text-white"
          : isCurrent
            ? "border-[#6C47FF] bg-[#6C47FF] text-white"
            : "border-white/20 bg-[#1a0b2e] text-white/40",
      )}
    >
      {isDone ? <CheckIcon className="size-5" /> : <Icon className="size-5" />}
    </div>
  );
}

function getRoundIcon(roundId: string) {
  switch (roundId) {
    case "screening":
      return IconUserCheck;
    case "behavioural":
      return IconEyeSearch;
    case "technical-thinking":
      return IconCodeAsterisk;
    case "career-readiness":
      return IconUsersGroup;
    default:
      return IconUserCheck;
  }
}

function RoundResultBadge({ score }: { score: number | null }) {
  const result = getRoundResult(score);

  return (
    <span
      className={cn(
        "rounded-full px-4 py-1 text-xs font-semibold text-white",
        result.className,
      )}
    >
      {result.label}
    </span>
  );
}

function getRoundResult(score: number | null): {
  label: string;
  className: string;
} {
  if (typeof score !== "number") {
    return { label: "Completed", className: "bg-[#4D8F62]" };
  }

  if (score >= 90) return { label: "Excellent", className: "bg-[#4D8F62]" };
  if (score >= 70) return { label: "Good", className: "bg-[#F49B22]" };
  if (score >= 50) return { label: "Average", className: "bg-[#DE7B48]" };
  return { label: "Poor", className: "bg-[#C7433F]" };
}

function formatExperienceLabel(min: number | null, max: number | null) {
  if (min == null && max == null) return "";
  if (min != null && max != null) return `${min}-${max} years`;
  if (min != null) return `${min}+ years`;
  return `Up to ${max} years`;
}

function formatSalaryRange(min: number | null, max: number | null) {
  const minLpa = min == null ? null : min / 100_000;
  const maxLpa = max == null ? null : max / 100_000;

  if (minLpa == null && maxLpa == null) return null;
  if (minLpa != null && maxLpa != null) {
    if (minLpa === maxLpa) return `₹${formatLpa(minLpa)} LPA`;
    return `₹${formatLpa(minLpa)}–${formatLpa(maxLpa)} LPA`;
  }
  if (minLpa != null) return `₹${formatLpa(minLpa)} LPA+`;
  if (maxLpa != null) return `Up to ₹${formatLpa(maxLpa)} LPA`;
  return null;
}

function formatLpa(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function isLast(index: number, length: number) {
  return index === length - 1;
}
