import { useEffect, useRef, useState } from "react";
import { InterviewLiveKitSession } from "#/shared/livekit/components/interview-livekit-session";
import type { PreScreeningConnectionDetails } from "#/pre-screening/types";
import type { PreScreenTranscriptMessage } from "#/pre-screening/pre-screening-types";
import { getPreScreeningSetup } from "#/pre-screening/setup";

type AssessmentSessionPageProps = {
  studentName?: string | null;
};

export function AssessmentSessionPage(props: AssessmentSessionPageProps) {
  const [connection, setConnection] = useState<PreScreeningConnectionDetails | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFinalizingSession, setIsFinalizingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const hasAutoStartedSessionRef = useRef(false);

  async function startLiveKitSession() {
    setIsConnecting(true);
    setSessionError(null);

    try {
      const response = await fetch("/api/livekit/pre-screening", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ setup: getPreScreeningSetup() }),
      });

      const payload = (await response.json()) as PreScreeningConnectionDetails | { error?: string };

      if (!response.ok) {
        const message = "error" in payload ? payload.error : undefined;
        throw new Error(message || "Failed to start the assessment session.");
      }

      setConnection(payload as PreScreeningConnectionDetails);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "Failed to start the session.");
    } finally {
      setIsConnecting(false);
    }
  }

  useEffect(() => {
    if (connection || isConnecting || hasAutoStartedSessionRef.current) {
      return;
    }

    hasAutoStartedSessionRef.current = true;
    void startLiveKitSession();
  }, [connection, isConnecting]);

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
        throw new Error(payload.error || "Failed to finalize the assessment session.");
      }

      window.location.href = `/assessment/report?sessionId=${input.sessionId}`;
      return true;
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "Failed to finalize the session.");
      return false;
    } finally {
      setIsFinalizingSession(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_32%),radial-gradient(circle_at_left_bottom,rgba(56,189,248,0.16),transparent_24%),linear-gradient(180deg,#020617,#0f172a)] px-3 font-['Sora',sans-serif] text-slate-100">
      <div className="mx-auto flex h-dvh w-full max-w-[420px] flex-col px-4 py-6 sm:px-0">
        {connection ? (
          <InterviewLiveKitSession
            connection={connection}
            pending={isConnecting || isFinalizingSession}
            studentName={props.studentName}
            sessionSubtitleFallback="Assessment session"
            onExit={() => {
              window.location.href = "/assessment";
            }}
            onFinalizeSession={handleFinalizeSession}
            onRetry={async () => {
              setConnection(null);
              hasAutoStartedSessionRef.current = false;
              await startLiveKitSession();
            }}
          />
        ) : (
          <section className="rounded-3xl border border-slate-800/90 bg-slate-950/85 p-5 shadow-[0_28px_60px_rgba(2,6,23,0.55)]">
            <div className="text-lg font-semibold text-slate-50">Preparing session</div>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {isConnecting
                ? "Starting your assessment session..."
                : sessionError || "Waiting to connect you to Sana."}
            </p>
            <div className="mt-5 flex gap-3">
              <a
                className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
                href="/assessment"
              >
                Back
              </a>
              {!isConnecting ? (
                <button
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl border border-amber-300/50 bg-amber-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
                  type="button"
                  onClick={() => void startLiveKitSession()}
                >
                  Retry
                </button>
              ) : null}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
