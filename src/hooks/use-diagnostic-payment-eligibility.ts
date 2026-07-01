"use client";

import { useCallback, useEffect, useState } from "react";

export type DiagnosticPaymentEligibility = {
  canStartRound: boolean;
  diagnosticId: string | null;
  isPaid: boolean;
  reason:
    | "DIAGNOSTIC_ALREADY_PAID"
    | "FIRST_FREE_ROUND"
    | "PAYMENT_REQUIRED";
  requiresPayment: boolean;
};

type UseDiagnosticPaymentEligibilityState = {
  data: DiagnosticPaymentEligibility | null;
  error: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

export function useDiagnosticPaymentEligibility(params: {
  diagnosticId?: string | null;
  jobId: string;
}): UseDiagnosticPaymentEligibilityState {
  const [data, setData] = useState<DiagnosticPaymentEligibility | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!params.jobId) return;

    setIsLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ jobId: params.jobId });
      if (params.diagnosticId) query.set("diagnosticId", params.diagnosticId);
      const response = await fetch(`/api/payments/eligibility?${query}`, {
        cache: "no-store",
      });
      const json = (await response.json().catch(() => ({}))) as
        | DiagnosticPaymentEligibility
        | { error?: string };

      if (!response.ok || "error" in json) {
        throw new Error(
          "error" in json && json.error
            ? json.error
            : "Failed to check payment eligibility",
        );
      }

      setData(json as DiagnosticPaymentEligibility);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to check payment eligibility",
      );
    } finally {
      setIsLoading(false);
    }
  }, [params.diagnosticId, params.jobId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, error, isLoading, refresh };
}
