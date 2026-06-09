"use client";

import { ArrowRight, LoaderCircle, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useState } from "react";
import { DiagnosticsPageHeader } from "@/components/diagnostics/diagnostics-page-header";
import { Button } from "@/components/ui/button";
import {
  type DiagnosticBand,
  type DiagnosticJobOption,
  getDefaultDiagnosticBand,
  parseDiagnosticBand,
} from "@/lib/diagnostics/job-options";
import { cn } from "@/lib/utils";

type DiagnosticsSelectionClientProps = {
  initialBand?: string | null;
  options: DiagnosticJobOption[];
  user: { email: string | null; name: string | null };
};

export function DiagnosticsSelectionClient({
  initialBand,
  options,
  user,
}: DiagnosticsSelectionClientProps) {
  const router = useRouter();
  const defaultBand =
    parseDiagnosticBand(initialBand) ?? getDefaultDiagnosticBand(options);
  const [selectedBand, setSelectedBand] = useState<DiagnosticBand | null>(
    defaultBand,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedOption =
    options.find((option) => option.id === selectedBand) ?? options[0];

  if (!selectedOption) {
    return (
      <main className="grid min-h-dvh place-items-center px-4">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-foreground">
            No diagnostic jobs found
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Diagnostic bands are not configured yet.
          </p>
        </div>
      </main>
    );
  }

  async function handleStart() {
    if (!selectedOption || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    console.info("[diagnostics] selection start clicked", {
      selectedBand: selectedOption.id,
      selectedJob: selectedOption.title,
    });

    try {
      const response = await fetch("/api/diagnostics/select-band", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ band: selectedOption.id }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to start diagnostics.");
      }

      posthog.capture("diagnostic_band_selected", {
        band: selectedOption.id,
        job_title: selectedOption.title,
        salary_range: selectedOption.salary,
      });
      router.push("/diagnostics/rounds");
    } catch (startError) {
      console.info("[diagnostics] selection start failed", {
        error:
          startError instanceof Error ? startError.message : "Unknown error",
        selectedBand: selectedOption.id,
      });
      setError(
        startError instanceof Error
          ? startError.message
          : "Failed to start diagnostics.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-dvh bg-lavender text-foreground">
      <DiagnosticsPageHeader title="Software Developer Interview" user={user} />
      <section className="mx-auto flex w-full max-w-4xl flex-col justify-center page-container">
        <header className="mx-auto text-center mb-8">
          <h1 className="text-base font-semibold tracking-tight md:text-xl">
            Software Developer Interview Readiness Assessment
          </h1>
        </header>

        <div className="rounded-2xl bg-transparent p-3 md:bg-[linear-gradient(180deg,#F3F1FF_0%,#FFFFFF_100%)] md:p-6 md:shadow-[0_0_32px_rgba(35,24,68,0.12)]">
          <div>
            <h2 className="text-base text-center md:text-left font-semibold tracking-tight md:text-lg">
              Start with the band you want to prepare for
            </h2>
            <p className="mt-1.5 text-sm text-center md:text-left leading-6 text-muted-foreground">
              Each band is designed for different company expectations, salary
              ranges, and interview difficulty levels.
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {options.map((option) => (
              <DiagnosticJobCard
                key={option.id}
                option={option}
                selected={option.id === selectedOption.id}
                onSelect={() => setSelectedBand(option.id)}
              />
            ))}
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#EFE8BE] bg-[#FFFBE8] px-4 py-3 text-[#6B6B72]">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[#E4BE3D]" />
            <p className="text-sm leading-6">
              Choose your band wisely. You can't change it once the interview
              begins.
            </p>
          </div>

          {error ? (
            <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-center md:text-left text-muted-foreground md:text-sm">
              60-minute interview · 4 rounds · 10-20 minutes each
            </p>
            <Button
              className="w-full rounded-full! bg-button px-5 text-white md:w-auto"
              size="lg"
              disabled={isSubmitting}
              type="button"
              onClick={handleStart}
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  Continue Diagnostic interview
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function DiagnosticJobCard({
  option,
  selected,
  onSelect,
}: {
  option: DiagnosticJobOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "cursor-pointer shadow flex flex-col rounded-xl bg-card p-4 text-left transition border-2 border-transparent hover:shadow-lg",
        selected && "border-[#5E41CF]",
      )}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between gap-2">
        <div
          className={cn(
            "flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest",
            option.accentClassName,
          )}
        >
          <RadioDot selected={selected} />
          {option.label}
        </div>
        <span className="rounded-full bg-muted/60 px-2.5 py-0.5 text-[11px] font-medium text-foreground">
          {option.salary}
        </span>
      </div>

      <h3 className="mt-4 mb-2 text-base font-semibold tracking-tight text-foreground">
        {option.title}
      </h3>
      <p className="mt-1.5 text-sm leading-5.5 text-muted-foreground">
        {option.description}
      </p>

      <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
        {option.companies.map((company) => (
          <span
            key={company}
            className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-foreground"
          >
            {company}
          </span>
        ))}
      </div>
    </button>
  );
}

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 transition",
        selected
          ? "border-[#5E41CF] bg-[#5E41CF]"
          : "border-muted-foreground/40",
      )}
    >
      {selected ? <span className="h-1 w-1 rounded-full bg-white" /> : null}
    </span>
  );
}
