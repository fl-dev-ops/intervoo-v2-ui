"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme: {
    color: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
};

type RazorpayResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
};

type RazorpayCheckoutProps = {
  jobId?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  onSuccess?: (diagnosticId: string | null) => void;
  disabled?: boolean;
  children?: React.ReactNode;
};

export function RazorpayCheckout({
  jobId,
  userName,
  userEmail,
  userPhone,
  onSuccess,
  disabled,
  children,
}: RazorpayCheckoutProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleCheckout() {
    setIsLoading(true);

    try {
      // Create order
      const orderResponse = await fetch("/api/payments/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productSlug: "new-jd-practice",
          jobId,
        }),
      });

      if (!orderResponse.ok) {
        const error = await orderResponse.json();
        throw new Error(error.error || "Failed to create order");
      }

      const orderData = await orderResponse.json();

      // Open Razorpay checkout
      const options: RazorpayOptions = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Intervoo",
        description: "New JD Practice",
        order_id: orderData.razorpayOrderId,
        prefill: {
          name: userName || undefined,
          email: userEmail || undefined,
          contact: userPhone || undefined,
        },
        theme: {
          color: "#6C47FF",
        },
        handler: async (response: RazorpayResponse) => {
          try {
            // Verify payment
            const verifyResponse = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                jobId,
              }),
            });

            if (!verifyResponse.ok) {
              const error = await verifyResponse.json();
              throw new Error(error.error || "Payment verification failed");
            }

            const verifyData = await verifyResponse.json();
            toast.success("Payment successful! Redirecting...");

            if (onSuccess) {
              onSuccess(verifyData.diagnosticId);
            } else if (jobId) {
              router.push(`/jobs/${jobId}/prejoin`);
            } else {
              router.push("/jobs");
            }
          } catch (error) {
            console.error("Verification error:", error);
            toast.error(
              error instanceof Error
                ? error.message
                : "Payment verification failed",
            );
          } finally {
            setIsLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to start checkout",
      );
      setIsLoading(false);
    }
  }

  return (
    <Button
      type="button"
      disabled={disabled || isLoading}
      onClick={handleCheckout}
      className="rounded-full bg-[#6C47FF] px-5 text-sm font-bold text-white hover:bg-[#5E41CF]"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Processing...
        </>
      ) : (
        (children ?? "Pay ₹299")
      )}
    </Button>
  );
}
