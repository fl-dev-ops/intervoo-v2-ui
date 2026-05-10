"use client";

import { AlertTriangle, Check, Circle, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
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
};

export function DiagnosticsSelectionClient({
  initialBand,
  options,
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
      <main className="grid min-h-svh place-items-center px-4">
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

      router.push("/diagnostics/rounds");
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
    <main className="min-h-svh bg-background px-5 py-8 text-foreground">
      <section className="mx-auto w-full max-w-3xl">
        <header className="mx-auto max-w-lg text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Diagnostics
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            Software Developer Interview Readiness Assessment
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Choose the role band you want to prepare for. This calibrates all
            four diagnostic rounds before the interview begins.
          </p>
        </header>

        <div className="mt-8 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Start with the band you want to prepare for
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Each band is designed for different company expectations, salary
              ranges, and interview difficulty levels.
            </p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {options.map((option) => (
              <DiagnosticJobCard
                key={option.id}
                option={option}
                selected={option.id === selectedOption.id}
                onSelect={() => setSelectedBand(option.id)}
              />
            ))}
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-amber-700 dark:text-amber-300">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" />
            </span>
            <p className="text-sm leading-6">
              Choose your band carefully. You can't change it once the interview
              begins.
            </p>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              60-minute interview · 4 rounds · 15 minutes each
            </p>
            <button
              className={buttonVariants({
                className: "w-full sm:w-auto",
                size: "lg",
              })}
              disabled={isSubmitting}
              type="button"
              onClick={handleStart}
            >
              {isSubmitting ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isSubmitting ? "Starting..." : "Start diagnostic interview"}
            </button>
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
      className={cn(
        "flex min-h-[15rem] flex-col rounded-xl border bg-input/30 p-4 text-left shadow-sm transition hover:border-foreground/30",
        selected ? "border-foreground ring-1 ring-foreground" : "border-border",
      )}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between gap-3">
        <div
          className={cn(
            "flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em]",
            option.accentClassName,
          )}
        >
          {selected ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background">
              <Check className="h-3.5 w-3.5" />
            </span>
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground/35" />
          )}
          {option.label}
        </div>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">
          {option.salary}
        </span>
      </div>

      <h3 className="mt-4 text-base font-semibold tracking-tight">
        {option.title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {option.description}
      </p>

      <div className="mt-auto flex flex-wrap gap-2 pt-6">
        {option.companies.map((company) => (
          <span
            key={company}
            className="rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground"
          >
            {company}
          </span>
        ))}
      </div>
    </button>
  );
}
