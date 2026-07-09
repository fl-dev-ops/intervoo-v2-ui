"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRazorpay } from "@/components/payments/razorpay-provider";
import { Button } from "@/components/ui/button";
import {
  useCreatePaymentOrder,
  useVerifyPayment,
} from "@/hooks/payments/hooks";

type RazorpayCheckoutProps = {
  className?: string;
  diagnosticId: string;
  jobId: string;
  roundId?: string;
};

export function RazorpayCheckout({
  className,
  diagnosticId,
  jobId,
  roundId: _roundId,
}: RazorpayCheckoutProps) {
  const router = useRouter();
  const { error: sdkError, isReady, openCheckout } = useRazorpay();
  const orderMutation = useCreatePaymentOrder();
  const verifyMutation = useVerifyPayment();
  const isLoading = orderMutation.isPending;

  async function handleCheckout() {
    if (isLoading) return;
    if (!isReady) {
      toast.error(
        sdkError ?? "Payment checkout is still loading. Please try again.",
      );
      return;
    }

    try {
      const order = await orderMutation.mutateAsync({ diagnosticId, jobId });

      openCheckout({
        amount: order.amount,
        currency: order.currency,
        key: order.key,
        name: "Intervoo Diagnostics",
        onSuccess: async (response) => {
          try {
            await verifyMutation.mutateAsync(
              response as unknown as Record<string, unknown>,
            );
            toast.success("Diagnostic unlocked");
            router.refresh();
          } catch (error) {
            toast.error(getErrorMessage(error));
          }
        },
        orderId: order.razorpayOrderId,
        theme: { color: "#6C47FF" },
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Payment failed";
}
