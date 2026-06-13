"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, LoaderCircle, Play, Eye } from "lucide-react";
import { IconUserCheck } from "@tabler/icons-react";
import { AppHeader } from "@/components/app-header";
import { JobDetailCard } from "@/components/jobs/job-detail-card";
import { Button } from "@/components/ui/button";
import { DIAGNOSTIC_ROUNDS } from "@/lib/diagnostics/rounds-config";
import type { JobDetail } from "@/lib/jd-client";

type JobDetailClientProps = {
  job: JobDetail;
  readyRoundIds?: string[];
  processingRoundIds?: string[];
  diagnosticId?: string | null;
  user: { email: string | null; name: string | null };
};

export function JobDetailClient({
  job,
  readyRoundIds = [],
  processingRoundIds = [],
  diagnosticId,
  user,
}: JobDetailClientProps) {
  const router = useRouter();
  const [startingRoundId, setStartingRoundId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rounds = DIAGNOSTIC_ROUNDS.map((round, index) => ({
    ...round,
    isReportReady: readyRoundIds.includes(round.id),
    isReportProcessing: processingRoundIds.includes(round.id),
    questions: job.rounds[index]?.competencies?.length
      ? job.rounds[index].competencies
      : round.questions,
  }));
  const totalMinutes = rounds.length * 15;
  const activeRoundIndex = Math.max(
    rounds.findIndex(
      (round) => !round.isReportReady && !round.isReportProcessing,
    ),
    0,
  );
  const hasCompletedRound =
    readyRoundIds.length > 0 || processingRoundIds.length > 0;

  // While a round's report is still generating, refresh so the CTA flips to
  // "View Report" once it is ready.
  useEffect(() => {
    if (processingRoundIds.length === 0) return;

    const intervalId = window.setInterval(() => {
      router.refresh();
    }, 1500);

    return () => window.clearInterval(intervalId);
  }, [processingRoundIds, router]);

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

  return (
    <main className="min-h-dvh bg-[#F6F3F8] font-sans text-black">
      <AppHeader user={user} />
      <section className="mx-auto w-full max-w-225 px-4 pb-14 pt-6">
        {!hasCompletedRound && (
          <button
            type="button"
            onClick={() => router.push("/jobs")}
            className="inline-flex items-center gap-2 text-base font-semibold text-black"
          >
            <ArrowLeft className="size-5" />
            Back
          </button>
        )}

        <div className="mt-8">
          <JobDetailCard
            companyName={job.companyName}
            description={job.roleSummary ?? undefined}
            experience={formatExperienceLabel(job.experienceMinYears, job.experienceMaxYears)}
            overallScore={null}
            roundCount={rounds.length}
            sourceUrl={job.sourceUrl}
            jobTitle={job.jobTitle}
          />
        </div>

        <div className="mt-7 w-full rounded-[28px] bg-[linear-gradient(180deg,#0B061E_0%,#3C2390_100%)] px-5 py-9 md:px-8 md:py-10">
          <div className="space-y-7">
            {rounds.map((round, index) => {
              const isActive = index === activeRoundIndex;
              return (
                <article
                  key={round.id}
                  className="md:grid md:grid-cols-[44px_1fr] md:gap-x-4"
                >
                  <div className="relative hidden justify-center md:flex">
                    {!isLast(index, rounds.length) && (
                      <div className="absolute top-10 bottom-[-28px] w-px bg-[#6C47FF]/70" />
                    )}
                    <div
                      className={
                        isActive
                          ? "relative z-10 flex size-11 items-center justify-center rounded-full bg-[#6C47FF] text-white"
                          : "relative z-10 mt-3 flex size-8 items-center justify-center rounded-full border border-[#7A5CD7]/70 bg-[#2B176B] text-[#A991F4]"
                      }
                    >
                      {isActive ? (
                        <IconUserCheck className="size-5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                  </div>

                  <div
                    className={
                      isActive
                        ? "rounded-xl bg-white px-5 py-5 shadow-sm md:px-7"
                        : "rounded-xl border border-white/15 bg-white/10 px-5 py-5 text-white/70 md:px-7"
                    }
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p
                        className={
                          isActive
                            ? "text-xs font-bold uppercase tracking-[0.18em] text-[#D08A2C]"
                            : "text-xs font-bold uppercase tracking-[0.18em] text-white/40"
                        }
                      >
                        ROUND {index + 1}
                      </p>
                      <span
                        className={
                          isActive
                            ? "rounded-full bg-[#EFEFEF] px-3 py-1 text-sm font-semibold text-black"
                            : "rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-semibold text-white"
                        }
                      >
                        15 min
                      </span>
                    </div>

                    <h2
                      className={
                        isActive
                          ? "mt-4 text-xl font-bold tracking-tight text-black"
                          : "mt-3 text-xl font-bold tracking-tight text-white"
                      }
                    >
                      {round.title}
                    </h2>
                    <p
                      className={
                        isActive
                          ? "mt-1 max-w-[650px] text-sm leading-6 text-[#6B6B72]"
                          : "mt-1 max-w-[650px] text-sm leading-6 text-white/55"
                      }
                    >
                      {round.description}
                    </p>

                    <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                      {!round.isReportReady ? (
                        <div>
                          <p
                            className={
                              isActive
                                ? "text-sm font-semibold text-[#6B6B72]"
                                : "text-sm font-semibold text-white/70"
                            }
                          >
                            Questions may cover
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {round.questions.map((question) => (
                              <span
                                key={question}
                                className={
                                  isActive
                                    ? "rounded-xl border border-[#E2E0E6] bg-[#FAFAFA] px-3 py-2 text-xs font-medium text-black"
                                    : "rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-white/80"
                                }
                              >
                                {question}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div />
                      )}
                      {round.isReportReady && diagnosticId ? (
                        <Button
                          className={
                            isActive
                              ? "h-11 rounded-full bg-button px-8 text-base font-bold text-white"
                              : "h-10 rounded-full bg-white/15 px-6 text-sm font-bold text-white hover:bg-white/20"
                          }
                          onClick={() => router.push(`/report/${diagnosticId}`)}
                          type="button"
                        >
                          <Eye className="mr-2 size-4" />
                          View Report
                        </Button>
                      ) : round.isReportProcessing ? (
                        <Button
                          className={
                            isActive
                              ? "h-11 rounded-full bg-button px-8 text-base font-bold text-white"
                              : "h-10 rounded-full bg-white/15 px-6 text-sm font-bold text-white hover:bg-white/20"
                          }
                          disabled
                          type="button"
                        >
                          <LoaderCircle className="mr-2 size-4 animate-spin" />
                          Generating report...
                        </Button>
                      ) : (
                        <Button
                          className={
                            isActive
                              ? "h-11 rounded-full bg-button px-8 text-base font-bold text-white"
                              : "h-10 rounded-full bg-white/15 px-6 text-sm font-bold text-white hover:bg-white/20"
                          }
                          disabled={Boolean(startingRoundId)}
                          onClick={() => handleStart(round.id)}
                          type="button"
                        >
                          {startingRoundId === round.id ? (
                            <>
                              <LoaderCircle className="mr-2 size-4 animate-spin" />
                              Starting...
                            </>
                          ) : (
                            <>
                              <Play className="mr-2 size-4 fill-current" />
                              Start Round {index + 1}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {error ? (
          <div className="mt-4 w-full rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function formatExperienceLabel(min: number | null, max: number | null) {
  if (min == null && max == null) return "";
  if (min != null && max != null) return `${min}-${max} years`;
  if (min != null) return `${min}+ years`;
  return `Up to ${max} years`;
}

function isLast(index: number, length: number) {
  return index === length - 1;
}
