import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PRE_SCREENING_SECTION_CARDS } from "#/diagnostic/config";
import { PreScreenReportPanel } from "#/diagnostic/livekit/components/pre-screen-report-panel";
import { PreScreenLiveKitSession } from "#/diagnostic/livekit/components/pre-screen-livekit-session";
import type { PreScreeningConnectionDetails } from "#/diagnostic/livekit/types";
import type {
  PreScreenTranscriptMessage,
  PreScreeningSessionStatusResponse,
} from "#/diagnostic/pre-screening-types";
import {
  clearLegacyPreScreeningReportSession,
  savePreScreeningSetup,
} from "#/lib/pre-screening-setup";
import { usePreScreeningFlow } from "#/lib/pre-screening-flow";
import { cn } from "#/lib/utils";

const languageOptions = [
  { value: "tamil", label: "Tamil", nativeLabel: "தமிழ்" },
  { value: "hindi", label: "Hindi", nativeLabel: "हिन्दी" },
  { value: "telugu", label: "Telugu", nativeLabel: "తెలుగు" },
  { value: "kannada", label: "Kannada", nativeLabel: "ಕನ್ನಡ" },
  { value: "malayalam", label: "Malayalam", nativeLabel: "മലയാളം" },
  { value: "bengali", label: "Bengali", nativeLabel: "বাংলা" },
] as const;

const englishLevels = [
  {
    value: "beginner",
    label: "Beginner",
    description: "I struggle to speak in English. Basic words only.",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "I can hold a basic conversation but make mistakes.",
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "Fluent in most situations, minor gaps.",
  },
  {
    value: "native",
    label: "Native / Near-native",
    description: "Fully comfortable speaking English.",
  },
] as const;

const speedOptions = [
  {
    value: "normal",
    label: "Normal",
    speed: "1x",
    description: "Recommended - natural interview pace",
    icon: "▶",
  },
  {
    value: "relaxed",
    label: "Relaxed",
    speed: ".7x",
    description: "A bit slower - easier to follow",
    icon: "▷",
  },
  {
    value: "slow",
    label: "Slow",
    speed: ".5x",
    description: "For those just getting started with English",
    icon: "▷",
  },
] as const;

export const Route = createFileRoute("/pre-screening/")({
  component: PreScreeningPage,
});

function getSessionIdFromUrl() {
  if (typeof window === "undefined") {
    return null;
  }

  const sessionId = new URLSearchParams(window.location.search).get("sessionId");
  return sessionId && sessionId.length > 0 ? sessionId : null;
}

function replaceSessionIdInUrl(sessionId: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);

  if (sessionId) {
    url.searchParams.set("sessionId", sessionId);
  } else {
    url.searchParams.delete("sessionId");
  }

  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
}

function PreScreeningPage() {
  const { canStart, setup, step, setStep, updateSetup } = usePreScreeningFlow();
  const [connection, setConnection] = useState<PreScreeningConnectionDetails | null>(null);
  const [reportSessionId, setReportSessionId] = useState<string | null>(() =>
    getSessionIdFromUrl(),
  );
  const [reportStatus, setReportStatus] = useState<PreScreeningSessionStatusResponse | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFinalizingSession, setIsFinalizingSession] = useState(false);
  const [isRetryingEvaluation, setIsRetryingEvaluation] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const hasAutoStartedSessionRef = useRef(false);

  const nativeLanguage = setup.nativeLanguage ?? "bengali";
  const englishLevel = setup.englishLevel ?? "intermediate";
  const speakingSpeed = setup.speakingSpeed ?? "normal";

  function handleBack() {
    if (step === "nativeLanguage") {
      window.location.href = "/profile-created";
      return;
    }

    if (step === "englishLevel") {
      setStep("nativeLanguage");
      return;
    }

    if (step === "speakingSpeed") {
      setStep("englishLevel");
      return;
    }

    if (step === "session") {
      setConnection(null);
      setSessionError(null);
      setStep("intro");
      return;
    }

    if (
      step === "waitingForEvaluation" ||
      step === "evaluationReady" ||
      step === "evaluationFailed"
    ) {
      replaceSessionIdInUrl(null);
      setReportSessionId(null);
      setReportStatus(null);
      setSessionError(null);
      setStep("intro");
      return;
    }

    setStep("speakingSpeed");
  }

  async function startLiveKitSession() {
    setIsConnecting(true);
    setIsFinalizingSession(false);
    setSessionError(null);
    replaceSessionIdInUrl(null);
    setReportSessionId(null);
    setReportStatus(null);

    try {
      const response = await fetch("/api/livekit/pre-screening", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ setup }),
      });

      const payload = (await response.json()) as PreScreeningConnectionDetails | { error?: string };

      if (!response.ok) {
        const message = "error" in payload ? payload.error : undefined;
        throw new Error(message || "Failed to start the LiveKit session.");
      }

      setConnection(payload as PreScreeningConnectionDetails);
      setStep("session");
      return true;
    } catch (error) {
      setSessionError(
        error instanceof Error ? error.message : "Failed to start the LiveKit session.",
      );
      return false;
    } finally {
      setIsConnecting(false);
    }
  }

  function handleStartConversation() {
    savePreScreeningSetup(setup);
    void startLiveKitSession();
  }

  async function handleFinalizeSession(input: {
    sessionId: string;
    messages: PreScreenTranscriptMessage[];
  }) {
    setIsFinalizingSession(true);
    setSessionError(null);

    try {
      const response = await fetch(`/api/livekit/pre-screening/${input.sessionId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: input.messages }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to finalize pre-screen session.");
      }

      replaceSessionIdInUrl(input.sessionId);
      setReportSessionId(input.sessionId);
      setConnection(null);
      setReportStatus(null);
      setStep("waitingForEvaluation");
      return true;
    } catch (error) {
      replaceSessionIdInUrl(null);
      setReportSessionId(null);
      setConnection(null);
      setReportStatus(null);
      setSessionError(
        error instanceof Error ? error.message : "Failed to finalize pre-screen session.",
      );
      setStep("intro");
      return false;
    } finally {
      setIsFinalizingSession(false);
    }
  }

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
      setStep("waitingForEvaluation");
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "Failed to retry evaluation.");
    } finally {
      setIsRetryingEvaluation(false);
    }
  }

  useEffect(() => {
    clearLegacyPreScreeningReportSession();
  }, []);

  useEffect(() => {
    if (connection || step === "session") {
      return;
    }

    const sessionIdFromUrl = getSessionIdFromUrl();

    if (!sessionIdFromUrl) {
      return;
    }

    setReportSessionId(sessionIdFromUrl);

    if (step === "intro") {
      setStep("waitingForEvaluation");
    }
  }, [connection, setStep, step]);

  useEffect(() => {
    const activeSessionId = connection?.sessionId ?? reportSessionId;
    replaceSessionIdInUrl(activeSessionId ?? null);
  }, [connection?.sessionId, reportSessionId]);

  useEffect(() => {
    if (step !== "session") {
      hasAutoStartedSessionRef.current = false;
      return;
    }

    if (connection || isConnecting || hasAutoStartedSessionRef.current) {
      return;
    }

    hasAutoStartedSessionRef.current = true;

    void (async () => {
      const started = await startLiveKitSession();

      if (!started) {
        setStep("intro");
      }
    })();
  }, [connection, isConnecting, setStep, step]);

  useEffect(() => {
    if (!reportSessionId) {
      return;
    }

    if (
      step !== "waitingForEvaluation" &&
      step !== "evaluationReady" &&
      step !== "evaluationFailed"
    ) {
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

        if (nextStatus.report?.status === "READY") {
          setStep("evaluationReady");
          return;
        }

        if (nextStatus.report?.status === "FAILED") {
          setSessionError(nextStatus.report.errorMessage || "Evaluation failed.");
          setStep("evaluationFailed");
          return;
        }

        setStep("waitingForEvaluation");
        timeoutId = window.setTimeout(() => {
          void syncReportStatus();
        }, 4000);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSessionError(error instanceof Error ? error.message : "Failed to load report status.");
        setStep("evaluationFailed");
      }
    }

    void syncReportStatus();

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [reportSessionId, setStep, step]);

  const isSessionStep = step === "session" && Boolean(connection);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_32%),radial-gradient(circle_at_left_bottom,rgba(56,189,248,0.16),transparent_24%),linear-gradient(180deg,#020617,#0f172a)] px-3 font-['Sora',sans-serif] text-slate-100">
      <div
        className={cn(
          "mx-auto flex w-full max-w-[420px] flex-col px-4 py-6 sm:px-0",
          isSessionStep ? "h-dvh overflow-hidden" : "min-h-screen gap-4",
        )}
      >
        <div className={cn("flex items-center gap-3", isSessionStep ? "shrink-0" : "")}>
          <button
            className="inline-flex size-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
            type="button"
            onClick={handleBack}
          >
            ←
          </button>
          {step === "intro" ||
          step === "session" ||
          step === "waitingForEvaluation" ||
          step === "evaluationReady" ||
          step === "evaluationFailed" ? (
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              {step === "session"
                ? "Sana · AI Guide"
                : step === "waitingForEvaluation"
                  ? "Preparing report"
                  : step === "evaluationReady" || step === "evaluationFailed"
                    ? "Pre-call Evaluation"
                    : "Pre-screening"}
            </div>
          ) : null}
        </div>

        {step === "nativeLanguage" ? (
          <section className="rounded-3xl border border-slate-800/90 bg-slate-950/85 p-5 shadow-[0_28px_60px_rgba(2,6,23,0.55)]">
            <div className="inline-flex rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
              ⚙ Quick Setup · 1 of 3
            </div>
            <h1 className="mt-3 text-2xl leading-tight font-semibold text-slate-50">
              What&apos;s your <em className="not-italic text-amber-300">native language?</em>
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Sana will use this to help you when you&apos;re stuck.
            </p>

            <div className="mt-4 space-y-2">
              {languageOptions.map((option) => {
                const active = nativeLanguage === option.value;

                return (
                  <button
                    key={option.value}
                    className={cn(
                      "flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition",
                      active
                        ? "border-amber-300/50 bg-amber-400/15"
                        : "border-slate-700 bg-slate-900 hover:border-slate-500",
                    )}
                    type="button"
                    onClick={() => updateSetup({ nativeLanguage: option.value })}
                  >
                    <div className="text-sm font-semibold text-slate-100">
                      {option.label} <span className="text-slate-400">{option.nativeLabel}</span>
                    </div>
                    <div
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full border text-xs font-semibold",
                        active
                          ? "border-amber-300 bg-amber-400 text-slate-950"
                          : "border-slate-600 text-transparent",
                      )}
                    >
                      ✓
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              <button
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-amber-300/50 bg-amber-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
                type="button"
                onClick={() => {
                  updateSetup({ nativeLanguage });
                  setStep("englishLevel");
                }}
              >
                Continue →
              </button>
            </div>
          </section>
        ) : null}

        {step === "englishLevel" ? (
          <section className="rounded-3xl border border-slate-800/90 bg-slate-950/85 p-5 shadow-[0_28px_60px_rgba(2,6,23,0.55)]">
            <div className="inline-flex rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
              ⚙ Quick Setup · 2 of 3
            </div>
            <h1 className="mt-3 text-2xl leading-tight font-semibold text-slate-50">
              Your <em className="not-italic text-amber-300">English level</em> right now?
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Sana will adjust to match you. Your actual level gets measured in the Diagnostic
              Interview.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              💡 No right answer - just pick what feels true today.
            </p>

            <div className="mt-4 space-y-2">
              {englishLevels.map((option) => {
                const active = englishLevel === option.value;

                return (
                  <button
                    key={option.value}
                    className={cn(
                      "flex w-full items-start justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition",
                      active
                        ? "border-amber-300/50 bg-amber-400/15"
                        : "border-slate-700 bg-slate-900 hover:border-slate-500",
                    )}
                    type="button"
                    onClick={() => updateSetup({ englishLevel: option.value })}
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-100">{option.label}</div>
                      <div className="mt-1 text-xs text-slate-400">{option.description}</div>
                    </div>
                    <div
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                        active
                          ? "border-amber-300 bg-amber-400 text-slate-950"
                          : "border-slate-600 text-transparent",
                      )}
                    >
                      ✓
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              <button
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-amber-300/50 bg-amber-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
                type="button"
                onClick={() => {
                  updateSetup({ englishLevel });
                  setStep("speakingSpeed");
                }}
              >
                Continue →
              </button>
            </div>
          </section>
        ) : null}

        {step === "speakingSpeed" ? (
          <section className="rounded-3xl border border-slate-800/90 bg-slate-950/85 p-5 shadow-[0_28px_60px_rgba(2,6,23,0.55)]">
            <div className="inline-flex rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
              ⚙ Quick Setup · 3 of 3
            </div>

            <div className="mt-4 flex size-14 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-400/10 text-2xl">
              🤖
            </div>

            <h1 className="mt-3 text-2xl leading-tight font-semibold text-slate-50">
              How fast should <em className="not-italic text-amber-300">Sana</em> speak?
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              You can always change this later in Settings.
            </p>

            <div className="mt-4 space-y-2">
              {speedOptions.map((option) => {
                const active = speakingSpeed === option.value;

                return (
                  <button
                    key={option.value}
                    className={cn(
                      "flex w-full items-start justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition",
                      active
                        ? "border-amber-300/50 bg-amber-400/15"
                        : "border-slate-700 bg-slate-900 hover:border-slate-500",
                    )}
                    type="button"
                    onClick={() => updateSetup({ speakingSpeed: option.value })}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 inline-flex size-7 items-center justify-center rounded-full border border-slate-600 text-sm text-slate-300">
                        {option.icon}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-100">
                          {option.label} <span className="text-slate-400">{option.speed}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-400">{option.description}</div>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                        active
                          ? "border-amber-300 bg-amber-400 text-slate-950"
                          : "border-slate-600 text-transparent",
                      )}
                    >
                      ✓
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              <button
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-amber-300/50 bg-amber-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
                type="button"
                onClick={() => {
                  updateSetup({ speakingSpeed });
                  setStep("intro");
                }}
              >
                Done - Meet Sana →
              </button>
            </div>
            <div className="mt-3 text-center text-xs text-slate-400">
              3 of 3 complete · All set!
            </div>
          </section>
        ) : null}

        {step === "intro" ? (
          <section className="rounded-3xl border border-slate-800/90 bg-slate-950/85 p-5 shadow-[0_28px_60px_rgba(2,6,23,0.55)]">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-amber-300/30 bg-amber-400/15 text-3xl">
              🤖
            </div>
            <div className="mt-3 text-center text-2xl font-semibold text-slate-50">
              Meet <em className="not-italic text-amber-300">Sana</em>
            </div>
            <div className="mt-1 text-center text-xs uppercase tracking-[0.12em] text-slate-400">
              Your AI Pre-screening Guide
            </div>

            <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                <div className="inline-flex items-center gap-2">
                  <span className="text-amber-300">〰</span>
                  <span>Sana · AI Voice</span>
                </div>
                <span className="text-base">🔊</span>
              </div>
              <div className="text-sm leading-6 text-slate-200">
                "Tell me about the jobs you're targeting - I&apos;ll use that to{" "}
                <strong>build your personalised Diagnostic Interview.</strong>"
              </div>
            </div>

            <div className="mt-4 text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              ⏱ 5-7 minutes · 2 sections
            </div>

            <div className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              2 sections
            </div>

            {PRE_SCREENING_SECTION_CARDS.map((section) => (
              <div key={section.id}>
                <div
                  className={cn(
                    "mt-3 flex items-start gap-3 rounded-2xl border px-3 py-3",
                    section.tone === "amber"
                      ? "border-amber-300/30 bg-amber-400/10"
                      : "border-sky-300/30 bg-sky-500/10",
                  )}
                >
                  <div
                    className={cn(
                      "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-sm",
                      section.tone === "amber"
                        ? "bg-amber-400/20 text-amber-200"
                        : "bg-sky-400/20 text-sky-200",
                    )}
                  >
                    {section.icon}
                  </div>
                  <div>
                    <div
                      className={cn(
                        "text-sm font-semibold",
                        section.tone === "amber" ? "text-amber-200" : "text-sky-200",
                      )}
                    >
                      {section.title}
                    </div>
                    <div className="mt-1 text-xs leading-5 text-slate-300">
                      {section.description}
                    </div>
                  </div>
                </div>

                <div className="mx-auto mt-2 h-3 w-px bg-slate-700" />
              </div>
            ))}

            <div className="mt-1 flex items-start gap-3 rounded-2xl border border-emerald-300/30 bg-emerald-500/10 px-3 py-3">
              <div className="text-lg">📋</div>
              <div className="text-sm text-emerald-200">
                Personalised Diagnostic Interview built for your job targets
              </div>
            </div>

            <div className="mt-5">
              <button
                className="inline-flex h-12 w-full items-center justify-center rounded-full border border-amber-300/50 bg-amber-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canStart || isConnecting}
                type="button"
                onClick={handleStartConversation}
              >
                {isConnecting ? "Connecting..." : "🎙️ Start Conversation"}
              </button>
            </div>
            <div className="mt-3 text-center text-xs text-slate-400">
              Speak naturally · no right or wrong answers
            </div>
            {sessionError ? (
              <div className="mt-3 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {sessionError}
              </div>
            ) : null}
          </section>
        ) : null}

        {step === "session" && connection ? (
          <PreScreenLiveKitSession
            key={connection.sessionId}
            connection={connection}
            pending={isConnecting || isFinalizingSession}
            onExit={handleBack}
            onFinalizeSession={handleFinalizeSession}
            onRetry={async () => {
              await startLiveKitSession();
            }}
          />
        ) : null}

        {(step === "waitingForEvaluation" ||
          step === "evaluationReady" ||
          step === "evaluationFailed") &&
        reportSessionId ? (
          <PreScreenReportPanel
            status={
              step === "evaluationReady"
                ? "ready"
                : step === "evaluationFailed"
                  ? "failed"
                  : "waiting"
            }
            report={reportStatus?.report?.reportJson ?? null}
            errorMessage={sessionError || reportStatus?.report?.errorMessage || null}
            canRetry={import.meta.env.DEV}
            isRetrying={isRetryingEvaluation}
            onRetry={handleRetryEvaluation}
            onReset={handleBack}
          />
        ) : null}
      </div>
    </main>
  );
}
