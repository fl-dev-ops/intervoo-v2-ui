"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  FileText,
  LoaderCircle,
  Play,
} from "lucide-react";
import { IconUserCheck } from "@tabler/icons-react";
import { InterviewReadinessScore } from "@/components/diagnostics/interview-readiness-score";
import { Button } from "@/components/ui/button";
import { DIAGNOSTIC_ROUNDS } from "@/lib/diagnostics/rounds-config";
import type { JobDetail } from "@/lib/jd-client";

type JobDetailClientProps = {
  job: JobDetail;
  user: { email: string | null; name: string | null };
};

export function JobDetailClient({ job, user }: JobDetailClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rounds = DIAGNOSTIC_ROUNDS.map((round, index) => ({
    ...round,
    questions: job.rounds[index]?.competencies?.length
      ? job.rounds[index].competencies
      : round.questions,
  }));
  const totalMinutes = rounds.length * 15;

  async function handleStart(roundId: string) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      router.push(`/jobs/${job.jobId}/prejoin?round=${roundId}`);
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : "Failed to start diagnostics.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#F6F3F8] font-sans text-black">
      <JobDetailHeader user={user} />
      <section className="mx-auto w-full max-w-[900px] px-4 pb-14 pt-6">
        <button
          type="button"
          onClick={() => router.push("/jobs")}
          className="inline-flex items-center gap-2 text-base font-semibold text-black"
        >
          <ArrowLeft className="size-5" />
          Back
        </button>

        <div className="mt-8 grid w-full gap-4 md:grid-cols-[1fr_330px]">
          <JobSummaryCard job={job} roundCount={rounds.length} />
          <InterviewReadinessScore
            className="h-full border-0 bg-white p-4 shadow-none md:bg-white"
            score={null}
          />
        </div>

        <div className="mt-7 w-full rounded-[28px] bg-[linear-gradient(180deg,#0B061E_0%,#3C2390_100%)] px-5 py-9 md:px-8 md:py-10">
          <div className="space-y-7">
            {rounds.map((round, index) => {
              const isActive = index === 0;
              return (
                <article
                  key={round.id}
                  className="grid grid-cols-[44px_1fr] gap-x-4"
                >
                  <div className="relative flex justify-center">
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
                      {isActive ? <IconUserCheck className="size-5" /> : index + 1}
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
                      {isActive ? (
                        <div>
                          <p className="text-sm font-semibold text-[#6B6B72]">
                            Questions may cover
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {round.questions.map((question) => (
                              <span
                                key={question}
                                className="rounded-xl border border-[#E2E0E6] bg-[#FAFAFA] px-3 py-2 text-xs font-medium text-black"
                              >
                                {question}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div />
                      )}
                      <Button
                        className={
                          isActive
                            ? "h-11 rounded-full bg-button px-8 text-base font-bold text-white"
                            : "h-10 rounded-full bg-white/15 px-6 text-sm font-bold text-white hover:bg-white/20"
                        }
                        disabled={isSubmitting}
                        onClick={() => handleStart(round.id)}
                        type="button"
                      >
                        {isSubmitting ? (
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

function JobDetailHeader({
  user,
}: {
  user: { email: string | null; name: string | null };
}) {
  return (
    <header className="border-b border-[#EDEAF0] bg-white">
      <div className="mx-auto flex h-[72px] w-full max-w-[1080px] items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Image
            src="/intervoo-logo-light.svg"
            alt="Intervoo"
            width={38}
            height={22}
            className="brightness-0"
            priority
          />
          <div className="hidden leading-none sm:block">
            <p className="text-base font-extrabold tracking-tight text-black">
              Intervoo.ai
            </p>
            <p className="mt-1 text-xs text-black/80">by Foreverlearning.in</p>
          </div>
        </div>
        <div className="flex size-9 items-center justify-center rounded-full bg-[#242225] text-sm font-bold text-white">
          {getInitial(user)}
        </div>
      </div>
    </header>
  );
}

function JobSummaryCard({ job, roundCount }: { job: JobDetail; roundCount: number }) {
  return (
    <div className="rounded-2xl bg-white px-5 py-5">
      <div className="flex items-start gap-4">
        <div className="flex size-[72px] shrink-0 items-center justify-center rounded-xl border border-[#DAD6DE] bg-white p-2 text-center text-sm font-extrabold leading-none text-[#F0642E]">
          {getLogoText(job.companyName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#6D6873]">{job.companyName}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-black">
            {job.jobTitle}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#F3F0F4] px-3 py-1 text-xs font-bold text-black">
              {formatExperienceLabel(job.experienceMinYears, job.experienceMaxYears)}
            </span>
            <span className="rounded-full border border-[#E0DDE4] bg-white px-3 py-1 text-xs font-bold text-black">
              {roundCount} Rounds
            </span>
          </div>
          {job.roleSummary && (
            <p className="mt-4 max-w-[520px] text-sm leading-6 text-[#6D6873]">
              {job.roleSummary}
            </p>
          )}
          {job.sourceUrl && (
            <a
              href={job.sourceUrl}
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
  );
}

function formatExperienceLabel(min: number | null, max: number | null) {
  if (min == null && max == null) return "Experience not listed";
  if (min != null && max != null) return `${min}-${max} years`;
  if (min != null) return `${min}+ years`;
  return `Up to ${max} years`;
}

function getInitial(user: { email: string | null; name: string | null }) {
  const source = user.name?.trim() || user.email?.trim() || "U";
  return source.charAt(0).toUpperCase();
}

function getLogoText(companyName: string) {
  const words = companyName.split(/\s+/).filter(Boolean);
  if (!words.length) return "JOB";
  if (words.length === 1) return words[0].slice(0, 6).toUpperCase();
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function isLast(index: number, length: number) {
  return index === length - 1;
}
