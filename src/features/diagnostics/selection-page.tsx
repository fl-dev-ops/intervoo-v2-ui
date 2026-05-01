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
      <div className="bg-[linear-gradient(180deg,#100725_0%,#3C2390_100%)] px-4 pt-10 pb-28 sm:pt-16" />
      <section className="mx-auto -mt-24 w-full max-w-6xl px-4 pb-10">
        <div className="rounded-[2rem] bg-[#f7f4ff] px-5 py-8 shadow-[0_30px_70px_rgba(40,28,82,0.16)] sm:px-8 lg:px-12">
          <header className="text-center">
            <img alt="Intervoo" className="mx-auto h-16 w-28" src="/intervoo-logo.svg" />
            <h1 className="mt-4 text-3xl font-semibold text-[#16111d]">Intervoo.ai</h1>
            <p className="mx-auto mt-5 max-w-md text-lg leading-7 text-[#2f2938]">
              Speak better. Interview better. With India-trained voice AI.
            </p>
          </header>

          <div className="mt-8 rounded-[1.4rem] border border-[#e2dfea] bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fbf5d9] text-[#7b6925]">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#2b2233]">Upcoming diagnostic interview</p>
                <p className="mt-1 text-base font-bold text-[#16111d] sm:text-lg">
                  Monday, 17th May 2026 - 11.00 AM
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <p className="font-semibold text-[#201a2c]">You told us</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {options.slice(0, 2).map((option) => (
                <div
                  key={option.band}
                  className="inline-flex items-center gap-2 rounded-full border border-[#d9d6df] bg-white px-3 py-1.5 text-sm text-[#2b2233]"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5dcc83] text-white">
                    <Check className="h-4 w-4" />
                  </span>
                  <span>
                    {option.band === "dream" ? "Dream" : "Target"}: <strong>{option.title}</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {options.map((option) => (
              <DiagnosticJobCard
                key={option.band}
                option={option}
                selected={option.band === selectedOption.band}
                onSelect={() => setSelectedBand(option.band)}
              />
            ))}
          </div>

          <div className="mt-10 text-center">
            <Button asChild size="lg" className="px-10 text-base">
              <Link to="/diagnostics/prejoin" search={{ band: selectedOption.band }}>
                Start Diagnostic interview →
              </Link>
            </Button>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-[#7f768f]">
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
      className={`min-h-80 rounded-[1.45rem] border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        props.selected ? "border-[#6A4DF5] ring-2 ring-[#6A4DF5]" : "border-[#e2dfea]"
      }`}
      onClick={props.onSelect}
    >
      <div className="flex items-center justify-between gap-3">
        <div className={`flex items-center gap-3 text-sm font-bold tracking-[0.12em] ${accent}`}>
          {props.selected ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#6A4DF5] text-white">
              <Circle className="h-2 w-2 fill-current" />
            </span>
          ) : (
            <span className="h-5 w-5 rounded-full border border-[#ded8e8]" />
          )}
          <span>{props.option.label.toUpperCase()}</span>
        </div>
        <span className="rounded-full border border-[#f1e2da] bg-[#fffaf7] px-4 py-2 text-sm font-bold text-[#16111d]">
          {props.option.salary}
        </span>
      </div>

      <h2 className="mt-7 text-2xl font-bold text-[#16111d]">{props.option.title}</h2>
      <p className="mt-3 text-base leading-7 text-[#777281]">{props.option.description}</p>

      <div className="mt-7 flex flex-wrap gap-2">
        {props.option.companies.map((company) => (
          <span
            key={company}
            className="rounded-full border border-[#f5dec7] bg-[#fff5e9] px-4 py-1.5 text-sm text-[#2b2233]"
          >
            {company}
          </span>
        ))}
      </div>
    </button>
  );
}
