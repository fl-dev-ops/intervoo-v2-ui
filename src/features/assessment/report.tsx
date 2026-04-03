import { useEffect, useState } from "react";
import { PreScreenReportPanel } from "#/pre-screening/components/pre-screen-report-panel";
import type { PreScreeningSessionStatusResponse } from "#/pre-screening/pre-screening-types";
import { getSessionIdFromUrl } from "#/shared/url/session-id";

export function AssessmentReportPage() {
  const [reportSessionId] = useState<string | null>(() => getSessionIdFromUrl());
  const [reportStatus, setReportStatus] = useState<PreScreeningSessionStatusResponse | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isRetryingEvaluation, setIsRetryingEvaluation] = useState(false);

  useEffect(() => {
    if (!reportSessionId) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | undefined;

    async function syncReportStatus() {
      try {
        const response = await fetch(`/api/livekit/pre-screening/${reportSessionId}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as
          | PreScreeningSessionStatusResponse
          | { error?: string };

        if (!response.ok) {
          const message = "error" in payload ? payload.error : "Failed to load report status.";
          throw new Error(message);
        }

        if (cancelled) {
          return;
        }

        const nextStatus = payload as PreScreeningSessionStatusResponse;
        setReportStatus(nextStatus);

        if (nextStatus.report?.status === "READY" || nextStatus.report?.status === "FAILED") {
          return;
        }

        timeoutId = window.setTimeout(() => {
          void syncReportStatus();
        }, 4000);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSessionError(error instanceof Error ? error.message : "Failed to load report status.");
      }
    }

    void syncReportStatus();

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [reportSessionId]);

  async function handleRetryEvaluation() {
    if (!reportSessionId) {
      return;
    }

    setIsRetryingEvaluation(true);
    setSessionError(null);

    try {
      const response = await fetch(
        `/api/livekit/pre-screening/${reportSessionId}/retry-evaluation`,
        {
          method: "POST",
        },
      );
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to retry evaluation.");
      }

      setReportStatus((current) =>
        current
          ? {
              ...current,
              report: current.report
                ? {
                    ...current.report,
                    status: "PROCESSING",
                    errorMessage: null,
                  }
                : null,
            }
          : current,
      );
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "Failed to retry evaluation.");
    } finally {
      setIsRetryingEvaluation(false);
    }
  }

  const panelStatus =
    reportStatus?.report?.status === "READY"
      ? "ready"
      : reportStatus?.report?.status === "FAILED" || sessionError
        ? "failed"
        : "waiting";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_32%),radial-gradient(circle_at_left_bottom,rgba(56,189,248,0.16),transparent_24%),linear-gradient(180deg,#020617,#0f172a)] px-3 font-['Sora',sans-serif] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col gap-4 px-4 py-6 sm:px-0">
        {!reportSessionId ? (
          <section className="rounded-3xl border border-slate-800/90 bg-slate-950/85 p-5 shadow-[0_28px_60px_rgba(2,6,23,0.55)]">
            <div className="text-lg font-semibold text-slate-50">No assessment report yet</div>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Start an assessment session first.
            </p>
            <a
              className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-2xl border border-amber-300/50 bg-amber-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
              href="/assessment"
            >
              Go to assessment
            </a>
          </section>
        ) : (
          <PreScreenReportPanel
            canRetry={panelStatus === "failed"}
            errorMessage={sessionError ?? reportStatus?.report?.errorMessage}
            isRetrying={isRetryingEvaluation}
            report={reportStatus?.report?.reportJson ?? null}
            status={panelStatus}
            onReset={() => {
              window.location.href = "/assessment";
            }}
            onRetry={() => {
              void handleRetryEvaluation();
            }}
          />
        )}
      </div>
    </main>
  );
}
