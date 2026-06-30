"use client";

import { useRouter } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DiagnosticsAgentSession } from "@/components/diagnostics/diagnostics-agent-session";
import { PROCTOR_TEST_CONTAINER_ID } from "@/lib/proctor/default-config";
import type { ProctorConfig } from "@/lib/proctor/types";

type AutoProctorConstructor = new (credentials: {
  clientId: string;
  hashedTestAttemptId: string;
  testAttemptId: string;
}) => AutoProctorInstance;

type AutoProctorInstance = {
  destroy: () => void;
  getReport?: () => unknown | Promise<unknown>;
  setup: (options: ProctorConfig) => Promise<void>;
  start: () => void;
  stop: () => void;
};

declare global {
  interface Window {
    AutoProctor?: AutoProctorConstructor;
  }
}

type Props = {
  coach?: string;
  companies?: string[];
  config: ProctorConfig;
  jobId?: string;
  jobTitle?: string;
  roundId?: string;
  sessionId: string;
  userName?: string | null;
};

type ProctorCredentials = {
  clientId: string;
  hashedTestAttemptId: string;
  testAttemptId: string;
};

type LiveKitTokenResponse = {
  participant_token: string;
  room_name: string;
  server_url: string;
};

const SDK_SRC = "https://cdn.autoproctor.co/ap-entry.js";

export function ProctoredDiagnosticsSession({
  coach,
  companies,
  config,
  jobId,
  jobTitle,
  roundId,
  sessionId,
  userName,
}: Props) {
  const router = useRouter();
  const apInstanceRef = useRef<AutoProctorInstance | null>(null);
  const hasStartedRef = useRef(false);
  const hasStoppedRef = useRef(false);
  const stopResolversRef = useRef<Array<() => void>>([]);
  const [sdkReady, setSdkReady] = useState(false);
  const [statusText, setStatusText] = useState("Loading proctoring...");
  const [liveKitDetails, setLiveKitDetails] =
    useState<LiveKitTokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (window.AutoProctor) {
      setSdkReady(true);
      return;
    }

    const handleLibReady = () => {
      setSdkReady(true);
    };
    const handleLibFailed = (event: Event) => {
      const detail = getEventDetail(event);
      setError(
        typeof detail?.statusDetails === "string"
          ? detail.statusDetails
          : "AutoProctor failed to load.",
      );
    };

    window.addEventListener("apLibReady", handleLibReady);
    window.addEventListener("apLibLoadingFailed", handleLibFailed);

    return () => {
      window.removeEventListener("apLibReady", handleLibReady);
      window.removeEventListener("apLibLoadingFailed", handleLibFailed);
    };
  }, []);

  const stopAndPersistProctoring = async () => {
    if (hasStoppedRef.current) return;
    const apInstance = apInstanceRef.current;
    if (apInstance) {
      const stopped = new Promise<void>((resolve) => {
        stopResolversRef.current.push(resolve);
      });
      try {
        apInstance.stop();
      } catch {
        apInstance.destroy();
      }
      await Promise.race([stopped, delay(1500)]);
      if (!hasStoppedRef.current) {
        hasStoppedRef.current = true;
        await persistStoppedState(sessionId, apInstance);
      }
      return;
    }

    hasStoppedRef.current = true;
    await persistStoppedState(sessionId, null);
  };

  useEffect(() => {
    if (!sdkReady || hasStartedRef.current) return;
    if (!window.AutoProctor) {
      setError("AutoProctor failed to load.");
      return;
    }

    let cancelled = false;

    async function startProctoring() {
      hasStartedRef.current = true;
      setStatusText("Preparing proctoring checks...");

      const credentials = await fetchJson<ProctorCredentials>(
        "/api/proctor/credentials",
        { sessionId },
      );

      if (cancelled) return;

      const AutoProctor = window.AutoProctor;
      if (!AutoProctor) {
        throw new Error("AutoProctor is unavailable.");
      }
      const apInstance = new AutoProctor(credentials);
      apInstanceRef.current = apInstance;

      await apInstance.setup(config);
      if (cancelled) return;

      setStatusText("Starting secure session...");
      apInstance.start();
    }

    const handleMonitoringStarted = () => {
      setStatusText("Proctoring active. Connecting interview...");
      void fetchJson("/api/proctor/state", {
        sessionId,
        status: "monitoring",
      });
      void fetchJson<LiveKitTokenResponse>("/api/livekit/session-token", {
        sessionId,
      })
        .then((details) => {
          if (!cancelled) setLiveKitDetails(details);
        })
        .catch((fetchError) => {
          const message = getErrorMessage(fetchError);
          setError(message);
        });
    };

    const handleMonitoringStopped = () => {
      if (hasStoppedRef.current) return;
      hasStoppedRef.current = true;
      void persistStoppedState(sessionId, apInstanceRef.current).finally(() => {
        const resolvers = stopResolversRef.current.splice(0);
        resolvers.forEach((resolve) => {
          resolve();
        });
      });
    };

    const handleError = (event: Event) => {
      const detail = getEventDetail(event);
      const errorCode =
        typeof detail?.errorCode === "number" ? detail.errorCode : null;
      const errorDetail =
        typeof detail?.message === "string"
          ? detail.message
          : "Proctoring could not start. Please allow camera and microphone access.";
      setError(errorDetail);
      void fetchJson("/api/proctor/failure", {
        errorCode,
        errorDetail,
        sessionId,
      }).finally(() => {
        router.replace(jobId ? `/jobs/${jobId}` : "/jobs");
      });
    };

    const handleEvidence = (event: Event) => {
      const detail = getEventDetail(event);
      const code = detail?.evidenceCode;
      if (code === 5001) {
        toast.warning("No face detected", {
          description: "Please ensure your face is visible on camera.",
        });
      } else if (code === 5002) {
        toast.warning("Multiple faces detected", {
          description: "Only one person should be visible on camera.",
        });
      }
    };

    window.addEventListener("apMonitoringStarted", handleMonitoringStarted);
    window.addEventListener("apMonitoringStopped", handleMonitoringStopped);
    window.addEventListener("apErrorEvent", handleError);
    window.addEventListener("apEvidenceEvent", handleEvidence);

    startProctoring().catch((startError) => {
      const message = getErrorMessage(startError);
      setError(message);
      void fetchJson("/api/proctor/failure", {
        errorDetail: message,
        sessionId,
      });
    });

    return () => {
      cancelled = true;
      window.removeEventListener(
        "apMonitoringStarted",
        handleMonitoringStarted,
      );
      window.removeEventListener(
        "apMonitoringStopped",
        handleMonitoringStopped,
      );
      window.removeEventListener("apErrorEvent", handleError);
      window.removeEventListener("apEvidenceEvent", handleEvidence);
    };
  }, [config, jobId, router, sdkReady, sessionId]);

  useEffect(() => {
    return () => {
      if (!apInstanceRef.current || hasStoppedRef.current) return;
      try {
        apInstanceRef.current.stop();
      } catch {
        apInstanceRef.current.destroy();
      }
      hasStoppedRef.current = true;
    };
  }, []);

  return (
    <>
      <Script
        src={SDK_SRC}
        strategy="afterInteractive"
        onLoad={() => setStatusText("Loading proctoring library...")}
      />
      <div id={PROCTOR_TEST_CONTAINER_ID} className="min-h-dvh">
        {liveKitDetails ? (
          <DiagnosticsAgentSession
            coach={coach}
            companies={companies}
            jobTitle={jobTitle}
            roomName={liveKitDetails.room_name}
            roundId={roundId}
            serverUrl={liveKitDetails.server_url}
            sessionId={sessionId}
            token={liveKitDetails.participant_token}
            userName={userName}
            onBeforeEndSession={stopAndPersistProctoring}
          />
        ) : (
          <main className="flex min-h-dvh items-center justify-center bg-[#1B1238] px-6 text-center text-white">
            <div className="max-w-md space-y-3">
              <div className="mx-auto size-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <h1 className="font-semibold text-lg">
                Starting secure interview
              </h1>
              <p className="text-sm text-white/70">{error ?? statusText}</p>
            </div>
          </main>
        )}
      </div>
    </>
  );
}

async function persistStoppedState(
  sessionId: string,
  apInstance: AutoProctorInstance | null,
) {
  const reportJson = apInstance?.getReport
    ? await Promise.resolve(apInstance.getReport()).catch(() => null)
    : null;
  const trustScore = extractTrustScore(reportJson);

  await fetchJson("/api/proctor/state", {
    reportJson,
    sessionId,
    status: "stopped",
    ...(typeof trustScore === "number" ? { trustScore } : {}),
  }).catch(() => {});
}

async function fetchJson<T = unknown>(
  url: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(
      json.error || `Request failed with status ${response.status}`,
    );
  }

  return json as T;
}

function extractTrustScore(reportJson: unknown) {
  if (
    !reportJson ||
    typeof reportJson !== "object" ||
    Array.isArray(reportJson)
  ) {
    return null;
  }
  const attemptDetails = (reportJson as Record<string, unknown>).attemptDetails;
  if (!attemptDetails || typeof attemptDetails !== "object") return null;
  const trustScore = (attemptDetails as Record<string, unknown>).trustScore;
  return typeof trustScore === "number" ? trustScore : null;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Proctoring failed.";
}

function getEventDetail(event: Event) {
  if ("detail" in event && event.detail && typeof event.detail === "object") {
    return event.detail as Record<string, unknown>;
  }
  return null;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
