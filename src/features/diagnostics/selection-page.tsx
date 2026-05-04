import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, Check, Circle } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
  buildDiagnosticJobOptions,
  getDefaultDiagnosticBand,
  type DiagnosticBand,
  type DiagnosticJobOption,
} from "#/lib/diagnostics/job-options";
import type { PrediagnosticsReportStatusResponse } from "#/lib/prediagnostics/report";

type DiagnosticsSelectionPageProps = {
  reportStatus: PrediagnosticsReportStatusResponse;
  onSelected?: (band: DiagnosticBand) => void;
};

export function DiagnosticsSelectionPage(props: DiagnosticsSelectionPageProps) {
  const options = useMemo(
    () => buildDiagnosticJobOptions(props.reportStatus),
    [props.reportStatus],
  );
  const defaultBand = getDefaultDiagnosticBand(options);
  const [selectedBand, setSelectedBand] = useState<DiagnosticBand | null>(defaultBand);
  const selectedOption = options.find((option) => option.band === selectedBand) ?? options[0];

  if (!selectedOption) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F5F3F7] px-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-[0_20px_40px_rgba(112,88,186,0.12)]">
          <h1 className="text-xl font-semibold text-[#201a2c]">No diagnostic jobs found</h1>
          <p className="mt-3 text-sm leading-6 text-[#7f768f]">
            Complete a pre-diagnostic report before starting the diagnostic interview.
          </p>
          <Button asChild className="mt-6 w-full" size="lg">
            <Link to="/prediagnostics" search={{ redo: false }}>
              Back to pre-diagnostics
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F3F7]">
      <div className="bg-[linear-gradient(180deg,#100725_0%,#3C2390_100%)] px-4 pt-8 pb-22 sm:pt-12" />
      <section className="mx-auto -mt-18 w-full max-w-5xl px-4 pb-8">
        <div className="rounded-[1.5rem] bg-[#f7f4ff] px-4 py-6 shadow-[0_20px_56px_rgba(40,28,82,0.12)] sm:px-6 lg:px-8">
          <header className="text-center">
            <img alt="Intervoo" className="mx-auto h-12 w-24" src="/intervoo-logo.svg" />
            <h1 className="mt-3 text-xl font-semibold text-[#16111d]">Intervoo.ai</h1>
            <p className="mx-auto mt-3 max-w-md text-base leading-6 text-[#2f2938]">
              Speak better. Interview better. With India-trained voice AI.
            </p>
          </header>

          <div className="mt-6 rounded-[1rem] border border-[#e2dfea] bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fbf5d9] text-[#7b6925]">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#2b2233]">Upcoming diagnostic interview</p>
                <p className="mt-0.5 text-base font-bold text-[#16111d]">
                  Monday, 17th May 2026 - 11.00 AM
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-sm font-semibold text-[#201a2c]">You told us</p>
            <div className="mt-2.5 flex flex-wrap gap-2.5">
              {options.slice(0, 2).map((option) => (
                <div
                  key={option.band}
                  className="inline-flex items-center gap-2 rounded-full border border-[#d9d6df] bg-white px-2.5 py-1 text-sm text-[#2b2233]"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#5dcc83] text-white">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span>
                    {option.band === "dream" ? "Dream" : "Target"}: <strong>{option.title}</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {options.map((option) => (
              <DiagnosticJobCard
                key={option.band}
                option={option}
                selected={option.band === selectedOption.band}
                onSelect={() => setSelectedBand(option.band)}
              />
            ))}
          </div>

          <div className="mt-8 text-center">
            {props.onSelected ? (
              <Button
                className="h-11 px-7 text-sm"
                type="button"
                onClick={() => props.onSelected?.(selectedOption.band)}
              >
                Start Diagnostic interview →
              </Button>
            ) : (
              <Button asChild className="h-11 px-7 text-sm">
                <Link to="/diagnostics" search={{}}>
                  Start Diagnostic interview →
                </Link>
              </Button>
            )}
            <p className="mx-auto mt-4 max-w-lg text-sm leading-5 text-[#7f768f]">
              Choosing a harder band doesn&apos;t penalise you. It gives you more specific feedback.
              You can retake with a different band anytime.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function DiagnosticJobCard(props: {
  option: DiagnosticJobOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const accent =
    props.option.band === "dream"
      ? "text-[#e8967f]"
      : props.option.band === "target"
        ? "text-[#efb04d]"
        : "text-[#7f9cff]";

  return (
    <button
      type="button"
      className={`min-h-66 rounded-[1.15rem] border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        props.selected ? "border-[#6A4DF5] ring-2 ring-[#6A4DF5]" : "border-[#e2dfea]"
      }`}
      onClick={props.onSelect}
    >
      <div className="flex items-center justify-between gap-3">
        <div className={`flex items-center gap-2.5 text-xs font-bold tracking-[0.12em] ${accent}`}>
          {props.selected ? (
            <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#6A4DF5] text-white">
              <Circle className="h-2 w-2 fill-current" />
            </span>
          ) : (
            <span className="h-4.5 w-4.5 rounded-full border border-[#ded8e8]" />
          )}
          <span>{props.option.label.toUpperCase()}</span>
        </div>
        <span className="rounded-full border border-[#f1e2da] bg-[#fffaf7] px-3 py-1.5 text-sm font-bold text-[#16111d]">
          {props.option.salary}
        </span>
      </div>

      <h2 className="mt-5 text-lg font-bold text-[#16111d]">{props.option.title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#777281]">{props.option.description}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {props.option.companies.map((company) => (
          <span
            key={company}
            className="rounded-full border border-[#f5dec7] bg-[#fff5e9] px-3 py-1 text-sm text-[#2b2233]"
          >
            {company}
          </span>
        ))}
      </div>
    </button>
  );
}
