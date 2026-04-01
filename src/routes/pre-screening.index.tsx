import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PRE_SCREENING_SECTION_CARDS } from "#/diagnostic/config";
import { PreScreenReportPanel } from "#/diagnostic/livekit/components/pre-screen-report-panel";
import { PreScreenLiveKitSession } from "#/diagnostic/livekit/components/pre-screen-livekit-session";
import type { PreScreeningConnectionDetails } from "#/diagnostic/livekit/types";
import type { PreScreeningSessionStatusResponse } from "#/diagnostic/pre-screening-types";
import {
  clearLegacyPreScreeningReportSession,
  savePreScreeningSetup,
} from "#/lib/pre-screening-setup";
import { usePreScreeningFlow } from "#/lib/pre-screening-flow";

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
    iconClassName: "setup-speed-icon setup-speed-icon--green",
  },
  {
    value: "relaxed",
    label: "Relaxed",
    speed: ".7x",
    description: "A bit slower - easier to follow",
    icon: "▷",
    iconClassName: "setup-speed-icon setup-speed-icon--blue",
  },
  {
    value: "slow",
    label: "Slow",
    speed: ".5x",
    description: "For those just getting started with English",
    icon: "▷",
    iconClassName: "setup-speed-icon setup-speed-icon--purple",
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
  const [isRetryingEvaluation, setIsRetryingEvaluation] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

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
    } catch (error) {
      setSessionError(
        error instanceof Error ? error.message : "Failed to start the LiveKit session.",
      );
    } finally {
      setIsConnecting(false);
    }
  }

  function handleStartConversation() {
    savePreScreeningSetup(setup);
    void startLiveKitSession();
  }

  function handleSessionEnded() {
    if (!connection) {
      return;
    }

    setSessionError(null);
    replaceSessionIdInUrl(connection.sessionId);
    setReportSessionId(connection.sessionId);
    setConnection(null);
    setReportStatus(null);
    setStep("waitingForEvaluation");
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
    <main className={`app-screen${isSessionStep ? " app-screen--session" : ""}`}>
      <div className={`mobile-shell${isSessionStep ? " mobile-shell--session" : ""}`}>
        <div className={`top-nav${isSessionStep ? " top-nav--session" : ""}`}>
          <button className="back-button" type="button" onClick={handleBack}>
            ←
          </button>
          {step === "intro" ||
          step === "session" ||
          step === "waitingForEvaluation" ||
          step === "evaluationReady" ||
          step === "evaluationFailed" ? (
            <div className="top-nav-copy">
              <div className="top-nav-label">
                {step === "session"
                  ? "Sana · AI Guide"
                  : step === "waitingForEvaluation"
                    ? "Preparing report"
                    : step === "evaluationReady" || step === "evaluationFailed"
                      ? "Pre-call Evaluation"
                      : "Pre-screening"}
              </div>
            </div>
          ) : null}
        </div>

        {step === "nativeLanguage" ? (
          <section className="content-card quick-setup-card">
            <div className="quick-setup-pill">⚙ Quick Setup · 1 of 3</div>
            <h1 className="display-title display-title--setup">
              What&apos;s your <em>native language?</em>
            </h1>
            <p className="support-copy support-copy--setup">
              Sana will use this to help you when you&apos;re stuck.
            </p>

            <div className="setup-option-stack">
              {languageOptions.map((option) => {
                const active = nativeLanguage === option.value;

                return (
                  <button
                    key={option.value}
                    className={`setup-option-card${active ? " is-active" : ""}`}
                    type="button"
                    onClick={() => updateSetup({ nativeLanguage: option.value })}
                  >
                    <div className="setup-option-copy">
                      <div className="setup-option-title">
                        {option.label} <span>{option.nativeLabel}</span>
                      </div>
                    </div>
                    <div className={`setup-option-check${active ? " is-active" : ""}`}>
                      {active ? "✓" : ""}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="button-row quick-setup-actions">
              <button
                className="primary-button"
                type="button"
                onClick={() => setStep("englishLevel")}
              >
                Continue →
              </button>
            </div>
          </section>
        ) : null}

        {step === "englishLevel" ? (
          <section className="content-card quick-setup-card">
            <div className="quick-setup-pill">⚙ Quick Setup · 2 of 3</div>
            <h1 className="display-title display-title--setup">
              Your <em>English level</em> right now?
            </h1>
            <p className="support-copy support-copy--setup">
              Sana will adjust to match you. Your actual level gets measured in the Diagnostic
              Interview.
            </p>
            <p className="setup-hint">💡 No right answer - just pick what feels true today.</p>

            <div className="setup-option-stack">
              {englishLevels.map((option) => {
                const active = englishLevel === option.value;

                return (
                  <button
                    key={option.value}
                    className={`setup-option-card setup-option-card--detailed${active ? " is-active" : ""}`}
                    type="button"
                    onClick={() => updateSetup({ englishLevel: option.value })}
                  >
                    <div className="setup-option-copy">
                      <div className="setup-option-title">{option.label}</div>
                      <div className="setup-option-description">{option.description}</div>
                    </div>
                    <div className={`setup-option-check${active ? " is-active" : ""}`}>
                      {active ? "✓" : ""}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="button-row quick-setup-actions">
              <button
                className="primary-button"
                type="button"
                onClick={() => setStep("speakingSpeed")}
              >
                Continue →
              </button>
            </div>
          </section>
        ) : null}

        {step === "speakingSpeed" ? (
          <section className="content-card quick-setup-card">
            <div className="quick-setup-pill">⚙ Quick Setup · 3 of 3</div>

            <div>
              <div className="speed-hero-icon">🤖</div>
            </div>

            <h1 className="display-title display-title--setup">
              How fast should <em>Sana</em> speak?
            </h1>
            <p className="support-copy">You can always change this later in Settings.</p>

            <div className="setup-option-stack">
              {speedOptions.map((option) => {
                const active = speakingSpeed === option.value;

                return (
                  <button
                    key={option.value}
                    className={`setup-option-card setup-option-card--detailed${active ? " is-active" : ""}`}
                    type="button"
                    onClick={() => updateSetup({ speakingSpeed: option.value })}
                  >
                    <div className={option.iconClassName}>{option.icon}</div>
                    <div className="setup-option-copy">
                      <div className="setup-option-title">
                        {option.label} <span>{option.speed}</span>
                      </div>
                      <div className="setup-option-description">{option.description}</div>
                    </div>
                    <div className={`setup-option-check${active ? " is-active" : ""}`}>
                      {active ? "✓" : ""}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="button-row quick-setup-actions">
              <button className="primary-button" type="button" onClick={() => setStep("intro")}>
                Done - Meet Sana →
              </button>
            </div>
            <div className="guide-footer-note">3 of 3 complete · All set!</div>
          </section>
        ) : null}

        {step === "intro" ? (
          <section className="content-card pre-screen-context-card">
            <div className="guide-avatar">🤖</div>
            <div className="guide-title">
              Meet <em>Sana</em>
            </div>
            <div className="guide-subtitle">Your AI Pre-screening Guide</div>

            <div className="voice-message-card">
              <div className="voice-message-header">
                <div className="voice-pill-icon">〰</div>
                <span>Sana · AI Voice</span>
                <span className="voice-speaker">🔊</span>
              </div>
              <div className="voice-message-copy">
                "Tell me about the jobs you're targeting - I&apos;ll use that to{" "}
                <strong>build your personalised Diagnostic Interview.</strong>"
              </div>
            </div>

            <div className="guide-meta">⏱ 5-7 minutes · 2 sections</div>

            <div className="section-list-label">2 sections</div>

            {PRE_SCREENING_SECTION_CARDS.map((section) => (
              <div key={section.id}>
                <div
                  className={`section-flow-card ${
                    section.tone === "amber"
                      ? "section-flow-card--amber"
                      : "section-flow-card--blue"
                  }`}
                >
                  <div
                    className={`section-flow-icon${
                      section.tone === "blue" ? " section-flow-icon--blue" : ""
                    }`}
                  >
                    {section.icon}
                  </div>
                  <div>
                    <div
                      className={`section-flow-title ${
                        section.tone === "amber"
                          ? "section-flow-title--amber"
                          : "section-flow-title--blue"
                      }`}
                    >
                      {section.title}
                    </div>
                    <div className="section-flow-copy">{section.description}</div>
                  </div>
                </div>

                <div className="section-connector" />
              </div>
            ))}

            <div className="section-result-card">
              <div className="section-result-icon">📋</div>
              <div className="section-result-copy">
                Personalised Diagnostic Interview built for your job targets
              </div>
            </div>

            <div className="button-row" style={{ marginTop: "18px" }}>
              <button
                className="primary-button primary-button--pill"
                disabled={!canStart || isConnecting}
                type="button"
                onClick={handleStartConversation}
              >
                {isConnecting ? "Connecting..." : "🎙️ Start Conversation"}
              </button>
            </div>
            <div className="guide-footer-note">Speak naturally · no right or wrong answers</div>
            {sessionError ? <div className="guide-inline-error">{sessionError}</div> : null}
          </section>
        ) : null}

        {step === "session" && connection ? (
          <PreScreenLiveKitSession
            connection={connection}
            pending={isConnecting}
            onExit={handleBack}
            onSessionEnded={handleSessionEnded}
            onRetry={startLiveKitSession}
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
