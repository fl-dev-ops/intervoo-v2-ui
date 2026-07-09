import { type UseMutationResult, useMutation } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PaymentOrderResponse = {
  amount: number;
  currency: string;
  key: string;
  razorpayOrderId: string;
};

export type CouponValidationResponse = {
  code: string;
  discountAmount: number;
  finalAmount: number;
  originalAmount: number;
  valid: true;
};

export type CreateOrderInput = {
  diagnosticId: string;
  jobId: string;
  couponCode?: string;
};

export type CouponInput = {
  code: string;
  diagnosticId: string;
  jobId: string;
};

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function postJson<T>(
  url: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(json.error || "Payment request failed");
  }
  return json;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Create a Razorpay order for a diagnostic (optionally with a coupon). */
export function useCreatePaymentOrder(): UseMutationResult<
  PaymentOrderResponse,
  Error,
  CreateOrderInput
> {
  return useMutation({
    mutationFn: (input) =>
      postJson<PaymentOrderResponse>("/api/payments/order", input),
  });
}

/** Verify a completed Razorpay payment. */
export function useVerifyPayment(): UseMutationResult<
  unknown,
  Error,
  Record<string, unknown>
> {
  return useMutation({
    mutationFn: (response) => postJson("/api/payments/verify", response),
  });
}

/** Validate a coupon against a diagnostic. */
export function useValidateCoupon(): UseMutationResult<
  CouponValidationResponse,
  Error,
  CouponInput
> {
  return useMutation({
    mutationFn: (input) =>
      postJson<CouponValidationResponse>(
        "/api/payments/coupon/validate",
        input,
      ),
  });
}

/** Unlock a diagnostic for free with a fully-discounting coupon. */
export function useUnlockWithCoupon(): UseMutationResult<
  unknown,
  Error,
  CouponInput
> {
  return useMutation({
    mutationFn: (input) => postJson("/api/payments/coupon/unlock", input),
  });
}
