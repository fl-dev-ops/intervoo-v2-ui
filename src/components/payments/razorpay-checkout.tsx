"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useRazorpay } from "@/components/payments/razorpay-provider";
import { Button } from "@/components/ui/button";

type RazorpayCheckoutProps = {
  className?: string;
  diagnosticId: string;
  jobId: string;
  roundId?: string;
};

type PaymentOrderResponse = {
  amount: number;
  currency: string;
  key: string;
  razorpayOrderId: string;
};

export function RazorpayCheckout({
  className,
  diagnosticId,
  jobId,
  roundId: _roundId,
}: RazorpayCheckoutProps) {
  const router = useRouter();
  const { error: sdkError, isReady, openCheckout } = useRazorpay();
  const [isLoading, setIsLoading] = useState(false);

  async function handleCheckout() {
    if (isLoading) return;
    if (!isReady) {
      toast.error(
        sdkError ?? "Payment checkout is still loading. Please try again.",
      );
      return;
    }

    setIsLoading(true);
    try {
      const order = await postJson<PaymentOrderResponse>(
        "/api/payments/order",
        {
          diagnosticId,
          jobId,
        },
      );

      openCheckout({
        amount: order.amount,
        currency: order.currency,
        key: order.key,
        name: "Intervoo Diagnostics",
        onSuccess: async (response) => {
          try {
            await postJson("/api/payments/verify", response);
            toast.success("Diagnostic unlocked");
            router.refresh();
          } catch (error) {
            toast.error(getErrorMessage(error));
            setIsLoading(false);
          }
        },
        orderId: order.razorpayOrderId,
        theme: { color: "#6C47FF" },
      });

      setIsLoading(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setIsLoading(false);
    }
  }

  return (
    <Button
      className={className}
      disabled={isLoading || !isReady}
      onClick={handleCheckout}
      size="lg"
      type="button"
    >
      {isLoading ? (
        <>
          <LoaderCircle className="mr-1 size-4 animate-spin" />
          Preparing...
        </>
      ) : (
        "Pay ₹299 to unlock"
      )}
    </Button>
  );
}

async function postJson<T = unknown>(
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
    throw new Error(json.error || "Payment request failed");
  }

  return json as T;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Payment failed";
}
