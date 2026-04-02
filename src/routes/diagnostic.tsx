import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { InterviewLiveKitSession } from "#/common/livekit/components/interview-livekit-session";
import type { DiagnosticConnectionDetails } from "#/diagnostic/types";
import { getSession } from "#/lib/auth.functions";
import { cn } from "#/lib/utils";

type DiagnosticStep = "intro" | "preview" | "session";
const DIAGNOSTIC_STEPS: DiagnosticStep[] = ["intro", "preview", "session"];

export const Route = createFileRoute("/diagnostic")({
  beforeLoad: async () => {
    const session = await getSession();

    if (!session?.user) {
      throw redirect({ to: "/login" });
    }

    if (!session.user.hasCompletedOnboarding) {
      throw redirect({ to: "/onboarding" });
    }

    return { session };
  },
  component: DiagnosticInterviewPage,
});

function DiagnosticInterviewPage() {
  const { session } = Route.useRouteContext();
  const [step, setStep] = useState<DiagnosticStep>(() => resolveStepFromUrl());
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreparingPreview, setIsPreparingPreview] = useState(false);
  const [connection, setConnection] = useState<DiagnosticConnectionDetails | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isSessionStep = step === "session" && Boolean(connection);

  useEffect(() => {
    replaceUrlStep(step);
  }, [step]);

  const stopPreviewStream = useCallback(() => {
    setPreviewStream((current) => {
      current?.getTracks().forEach((track) => track.stop());
      return null;
    });
  }, []);

  const requestPreviewStream = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setPreviewError("Camera preview is not supported in this browser.");
      return;
    }

    setIsPreparingPreview(true);
    setPreviewError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });
      setPreviewStream((current) => {
        current?.getTracks().forEach((track) => track.stop());
        return stream;
      });
    } catch (error) {
      setPreviewError(getMediaPermissionError(error));
      stopPreviewStream();
    } finally {
      setIsPreparingPreview(false);
    }
  }, [stopPreviewStream]);

  useEffect(() => {
    if (step !== "preview") {
      stopPreviewStream();
      return;
    }

    void requestPreviewStream();
  }, [requestPreviewStream, step, stopPreviewStream]);

  useEffect(() => {
    return () => {
      stopPreviewStream();
    };
  }, [stopPreviewStream]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      return;
    }

    if (!previewStream) {
      videoElement.srcObject = null;
      return;
    }

    videoElement.srcObject = previewStream;
    void videoElement.play().catch(() => {
      // Browsers can block autoplay without user interaction.
    });
  }, [previewStream]);

  async function startDiagnosticInterviewSession() {
    if (isConnecting) {
      return;
    }

    setIsConnecting(true);
    setSessionError(null);
    stopPreviewStream();

    try {
      const response = await fetch("/api/livekit/diagnostic", {
        method: "POST",
      });
      const payload = (await response.json()) as DiagnosticConnectionDetails | { error?: string };

      if (!response.ok) {
        const message = "error" in payload ? payload.error : undefined;
        throw new Error(message || "Failed to start diagnostic interview.");
      }

      setConnection(payload as DiagnosticConnectionDetails);
      setStep("session");
    } catch (error) {
      setConnection(null);
      setSessionError(
        error instanceof Error ? error.message : "Failed to start diagnostic interview.",
      );
      setStep("preview");
    } finally {
      setIsConnecting(false);
    }
  }

  function handleBack() {
    if (step === "session") {
      setConnection(null);
      setSessionError(null);
      setStep("intro");
      return;
    }

    if (step === "preview") {
      setPreviewError(null);
      setStep("intro");
      return;
    }

    window.location.href = "/pre-screening";
  }

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
          <div className="text-lg font-semibold text-slate-300">Diagnostic Interview</div>
        </div>

        {step === "intro" ? (
          <section className="rounded-3xl border border-slate-800/90 bg-slate-950/85 p-5 shadow-[0_28px_60px_rgba(2,6,23,0.55)]">
            <div className="inline-flex rounded-full border border-amber-300/40 bg-amber-400/12 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-amber-200">
              📅 Diagnostic Interview Ready
            </div>

            <h1 className="mt-4 text-[2.1rem] leading-tight font-semibold text-slate-50">
              Your <em className="not-italic font-semibold text-amber-300">Diagnostic Interview</em>{" "}
              can start now
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              You can take this immediately. Join Sana for a real interview conversation and get
              scored on CEFR, confidence, thinking, and communication.
            </p>

            <div className="mt-5 rounded-3xl border border-blue-400/25 bg-blue-500/10 p-4">
              <div className="text-sm font-semibold text-blue-300">⚡ Immediate Start</div>
              <div className="mt-1 text-2xl font-semibold text-slate-50">~15 minutes</div>
              <div className="text-sm text-slate-300">
                Link opens in-browser with camera and mic
              </div>
            </div>

            <div className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              What to expect
            </div>
            <div className="mt-3 rounded-3xl border border-slate-800 bg-slate-900/65 p-4 text-sm text-slate-200">
              <div>📹 Video conversation with Sana AI interviewer</div>
              <div className="mt-3">🎙 Conversational follow-up questions</div>
              <div className="mt-3">🤖 Scored using transcript + video signals</div>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-300/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
              ⚠ Session cannot be paused. Keep camera on and do not close this tab during the
              interview.
            </div>

            <button
              className="mt-5 inline-flex h-14 w-full items-center justify-center rounded-full border border-amber-300/50 bg-amber-400 px-5 text-lg font-semibold text-slate-950 transition hover:bg-amber-300"
              type="button"
              onClick={() => {
                setSessionError(null);
                setStep("preview");
              }}
            >
              Continue to Camera Check →
            </button>
          </section>
        ) : null}

        {step === "preview" ? (
          <section className="rounded-3xl border border-slate-800/90 bg-slate-950/85 p-5 shadow-[0_28px_60px_rgba(2,6,23,0.55)]">
            <div className="relative overflow-hidden rounded-[30px] border border-slate-700/80 bg-slate-950">
              <div className="relative aspect-[4/3]">
                {previewStream ? (
                  <video
                    ref={videoRef}
                    className="absolute inset-0 h-full w-full object-cover"
                    autoPlay
                    muted
                    playsInline
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.12),rgba(2,6,23,0.96))]">
                    <div className="text-center">
                      <div className="mx-auto flex size-24 items-center justify-center rounded-full border border-amber-300/20 bg-amber-400/10 text-5xl">
                        👤
                      </div>
                      <div className="mt-3 text-lg text-slate-300">Camera preview</div>
                    </div>
                  </div>
                )}

                <div className="absolute left-3 top-3 rounded-lg bg-black/55 px-3 py-1 text-sm font-semibold text-slate-100">
                  You
                </div>

                <div className="absolute right-3 top-3 rounded-2xl border border-amber-300/40 bg-slate-950/90 px-3 py-2 text-center">
                  <div className="text-xl">🤖</div>
                  <div className="mt-1 text-xs font-semibold tracking-[0.08em] text-amber-300">
                    SANA AI
                  </div>
                </div>

                {isPreparingPreview ? (
                  <div className="absolute inset-0 grid place-items-center bg-slate-950/70 text-sm font-semibold text-slate-200">
                    Preparing camera preview...
                  </div>
                ) : null}
              </div>
            </div>

            <h2 className="mt-5 text-5xl leading-tight font-semibold text-slate-100">
              Ready to <em className="not-italic font-semibold text-amber-300">begin?</em>
            </h2>
            <p className="mt-3 text-sm leading-8 text-slate-300">
              You&apos;ll have a video conversation with Sana, your AI interviewer. She&apos;ll ask
              questions and follow up naturally.
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3 text-center text-sm text-slate-300">
                🤫 Quiet space
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3 text-center text-sm text-slate-300">
                💡 Good light
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3 text-center text-sm text-slate-300">
                🌐 Stable Wi-Fi
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-amber-300/30 bg-amber-400/10 px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-3xl leading-none text-amber-300">⚠</div>
                <p className="text-[12px] leading-6 text-slate-300">
                  Session <span className="font-semibold text-amber-300">cannot be paused.</span>{" "}
                  ~15 minutes. Camera stays on throughout. Do not close this tab.
                </p>
              </div>
            </div>

            {previewError ? (
              <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm leading-6 text-red-100">
                {previewError}
                <button
                  className="mt-3 inline-flex h-10 items-center justify-center rounded-full border border-red-300/60 px-4 text-xs font-semibold uppercase tracking-[0.08em] text-red-100 transition hover:bg-red-400/15"
                  type="button"
                  onClick={() => {
                    void requestPreviewStream();
                  }}
                >
                  Retry camera check
                </button>
              </div>
            ) : null}

            {sessionError ? (
              <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm leading-6 text-red-100">
                {sessionError}
              </div>
            ) : null}

            <button
              className="mt-5 inline-flex h-14 w-full items-center justify-center rounded-full border border-amber-300/50 bg-amber-400 px-5 text-lg font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPreparingPreview || !previewStream || isConnecting}
              type="button"
              onClick={() => {
                void startDiagnosticInterviewSession();
              }}
            >
              {isConnecting ? "Connecting..." : "Begin Video Interview →"}
            </button>
          </section>
        ) : null}

        {step === "session" ? (
          connection ? (
            <InterviewLiveKitSession
              key={connection.sessionId}
              connection={connection}
              pending={isConnecting}
              studentName={firstName(session.user.name)}
              sessionSubtitleFallback="Diagnostic interview"
              experience="diagnostic"
              onExit={() => {
                setConnection(null);
                setSessionError(null);
                setStep("intro");
              }}
              onRetry={async () => {
                await startDiagnosticInterviewSession();
              }}
            />
          ) : (
            <section className="rounded-3xl border border-slate-800/90 bg-slate-950/85 p-5 text-sm text-slate-300 shadow-[0_28px_60px_rgba(2,6,23,0.55)]">
              Connecting to diagnostic interview...
            </section>
          )
        ) : null}
      </div>
    </main>
  );
}

function getMediaPermissionError(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Camera or microphone access is blocked. Allow permissions and retry.";
    }

    if (error.name === "NotFoundError") {
      return "No camera or microphone detected on this device.";
    }

    if (error.name === "NotReadableError") {
      return "Camera is currently in use by another app. Close it and retry.";
    }
  }

  return "Could not start camera preview. Please try again.";
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

function getStepFromUrl(): DiagnosticStep | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawStep = new URLSearchParams(window.location.search).get("step");
  if (!rawStep) {
    return null;
  }

  return DIAGNOSTIC_STEPS.includes(rawStep as DiagnosticStep) ? (rawStep as DiagnosticStep) : null;
}

function resolveStepFromUrl(): DiagnosticStep {
  const urlStep = getStepFromUrl();

  if (!urlStep || urlStep === "session") {
    return "intro";
  }

  return urlStep;
}

function replaceUrlStep(step: DiagnosticStep) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("step", step);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
}
