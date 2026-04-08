import { useEffect, useState } from "react";
import { IconCircle, IconCircleCheckFilled } from "@tabler/icons-react";
import type { PrediagnosticsReportStatusResponse } from "#/lib/prediagnostics/report";
import { triggerCelebrationConfetti } from "#/lib/confetti";

const REPORT_GENERATION_STEPS = [
  { label: "Job target captured" },
  { label: "Skill analysis" },
  { label: "Role level understanding" },
  { label: "Company level knowledge" },
  { label: "JD awareness" },
] as const;
const STEP_REVEAL_DELAY_MS = 1000;
const CONFETTI_HOLD_MS = 1000;

type PrediagnosticsGenerationStepProps = {
  sessionId: string;
  onCompleted: (payload: { sessionId: string }) => void;
};

export function PrediagnosticsGenerationStep(props: PrediagnosticsGenerationStepProps) {
  const [status, setStatus] = useState<"loading" | "processing" | "failed">("loading");
  const [error, setError] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function runGeneration() {
      setStatus("loading");
      setError(null);
      setCompletedSteps(0);

      try {
        const response = await fetch("/api/prediagnostics/generate-report", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId: props.sessionId }),
        });

        const payload = (await response.json().catch(() => null)) as
          | PrediagnosticsReportStatusResponse
          | {
              error?: string;
            }
          | null;

        if (!response.ok) {
          const message =
            payload &&
            typeof payload === "object" &&
            "error" in payload &&
            typeof payload.error === "string"
              ? payload.error
              : "Failed to generate pre-diagnostics report.";
          throw new Error(message);
        }

        const reportStatus = payload as PrediagnosticsReportStatusResponse;

        if (reportStatus.report?.status !== "READY" || !reportStatus.report.reportJson) {
          throw new Error(reportStatus.report?.errorMessage ?? "Report is not ready yet.");
        }

        if (cancelled) {
          return;
        }

        setStatus("processing");
      } catch (generationError) {
        if (cancelled) {
          return;
        }

        setStatus("failed");
        setError(
          generationError instanceof Error
            ? generationError.message
            : "Failed to generate pre-diagnostics report.",
        );
      }
    }

    void runGeneration();

    return () => {
      cancelled = true;
    };
  }, [props.sessionId]);

  useEffect(() => {
    if (status !== "processing") {
      return;
    }

    if (completedSteps === REPORT_GENERATION_STEPS.length) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCompletedSteps((current) => Math.min(current + 1, REPORT_GENERATION_STEPS.length));
    }, STEP_REVEAL_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [completedSteps, status]);

  useEffect(() => {
    if (status !== "processing" || completedSteps !== REPORT_GENERATION_STEPS.length) {
      return;
    }

    let cancelled = false;

    async function finishProcessing() {
      await triggerCelebrationConfetti();
      await new Promise((resolve) => window.setTimeout(resolve, CONFETTI_HOLD_MS));

      if (!cancelled) {
        props.onCompleted({ sessionId: props.sessionId });
      }
    }

    void finishProcessing();

    return () => {
      cancelled = true;
    };
  }, [completedSteps, props, status]);

  if (status === "failed") {
    return <PrediagnosticsGenerationErrorState message={error ?? "Failed to generate report."} />;
  }

  return <PrediagnosticsGenerationProcessingState completedSteps={completedSteps} />;
}

function PrediagnosticsGenerationProcessingState(props: { completedSteps: number }) {
  return (
    <section className="relative min-h-screen overflow-hidden bg-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-between px-6 py-10 text-center">
        <div className="w-full" />

        <div className="flex w-full flex-1 flex-col items-center">
          <img alt="Intervoo infinity mark" className="h-40 w-40" src="/infinity.svg" />

          <h1 className="mt-8 text-3xl font-semibold leading-none text-[#16111d]">
            Congratulations!
          </h1>

          <p className="mt-3 text-lg leading-7 text-[#6f667d]">
            Getting your pre-diagnostics report.
          </p>

          <div className="mt-12 w-full max-w-65 space-y-6 text-left">
            {REPORT_GENERATION_STEPS.map((step, index) => (
              <GenerationStepRow
                key={step.label}
                complete={index < props.completedSteps}
                label={step.label}
              />
            ))}
          </div>
        </div>

        <p className="pb-2 text-[#7f768f]">This may take a few seconds...</p>
      </div>
    </section>
  );
}

function PrediagnosticsGenerationErrorState(props: { message: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#F5F3F7] px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-[0_20px_40px_rgba(112,88,186,0.12)]">
        <h2 className="text-xl font-semibold text-[#2b2233]">Report unavailable</h2>
        <p className="mt-3 text-sm leading-6 text-[#7f768f]">{props.message}</p>
        <button
          className="mt-6 w-full rounded-full bg-[linear-gradient(90deg,#4F33A3_0%,#6A4DF5_100%)] px-6 py-4 text-sm font-medium text-white shadow-[0_12px_24px_rgba(93,72,220,0.28)]"
          type="button"
          onClick={() => {
            window.location.href = "/prediagnostics";
          }}
        >
          Back to start
        </button>
      </div>
    </div>
  );
}

function GenerationStepRow(props: { label: string; complete: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <span
        className={
          props.complete
            ? "flex shrink-0 items-center justify-center rounded-full bg-[#7ad487] text-white"
            : "shrink-0"
        }
      >
        {props.complete ? (
          <IconCircleCheckFilled className="h-7 w-7 bg-white text-green-600" />
        ) : (
          <IconCircle className="h-7 w-7 bg-white text-gray-300" />
        )}
      </span>
      <span className="text-[#16111d]">{props.label}</span>
    </div>
  );
}
