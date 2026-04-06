import { useCallback, useState } from "react";
import type {
  PrediagnosticsConnectionDetails,
  PrediagnosticsInteractionMode,
} from "#/lib/livekit/prediagnostics";

async function fetchConnectionDetails(
  interactionMode: PrediagnosticsInteractionMode,
): Promise<PrediagnosticsConnectionDetails> {
  const response = await fetch("/api/prediagnostics/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ interactionMode }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const errorMessage =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Failed to create LiveKit connection details";

    throw new Error(errorMessage);
  }

  return (await response.json()) as PrediagnosticsConnectionDetails;
}

export function usePrediagnosticsConnectionDetails() {
  const [connectionDetails, setConnectionDetails] =
    useState<PrediagnosticsConnectionDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshConnectionDetails = useCallback(
    async (interactionMode: PrediagnosticsInteractionMode) => {
      setIsLoading(true);
      setError(null);

      try {
        const nextConnectionDetails = await fetchConnectionDetails(interactionMode);
        setConnectionDetails(nextConnectionDetails);
        return nextConnectionDetails;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create LiveKit connection details";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return {
    connectionDetails,
    refreshConnectionDetails,
    isLoading,
    error,
  };
}
