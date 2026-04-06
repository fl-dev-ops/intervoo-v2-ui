import { useCallback, useState } from "react";
import type { PrediagnosticsConnectionDetails } from "#/prediagnostics/server";

async function fetchConnectionDetails(): Promise<PrediagnosticsConnectionDetails> {
  const response = await fetch("/api/prediagnostics/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as {
      error?: string;
    };
    throw new Error(errorData.error ?? "Failed to create LiveKit connection details");
  }

  return response.json() as Promise<PrediagnosticsConnectionDetails>;
}

export function usePrediagnosticsConnectionDetails() {
  const [connectionDetails, setConnectionDetails] =
    useState<PrediagnosticsConnectionDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshConnectionDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextConnectionDetails = await fetchConnectionDetails();
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
  }, []);

  return {
    connectionDetails,
    refreshConnectionDetails,
    isLoading,
    error,
  };
}
