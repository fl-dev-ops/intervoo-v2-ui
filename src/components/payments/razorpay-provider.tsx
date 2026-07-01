"use client";

import Script from "next/script";
import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

const RAZORPAY_CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

export type RazorpaySuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  amount: number;
  currency: string;
  key: string;
  name?: string;
  onSuccess: (response: RazorpaySuccessResponse) => void;
  orderId: string;
  theme?: { color?: string };
};

type RazorpayConstructorOptions = {
  amount: number;
  currency: string;
  handler: (response: RazorpaySuccessResponse) => void;
  key: string;
  name: string;
  order_id: string;
  theme?: { color?: string };
};

type RazorpayInstance = { open: () => void };

type RazorpayContextValue = {
  error: string | null;
  isReady: boolean;
  openCheckout: (options: RazorpayCheckoutOptions) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayConstructorOptions) => RazorpayInstance;
  }
}

const RazorpayContext = createContext<RazorpayContextValue | null>(null);

export function RazorpayProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = useMemo<RazorpayContextValue>(
    () => ({
      error,
      isReady,
      openCheckout: (options) => {
        if (!window.Razorpay) {
          throw new Error("Razorpay checkout is not ready yet.");
        }

        const checkout = new window.Razorpay({
          amount: options.amount,
          currency: options.currency,
          handler: options.onSuccess,
          key: options.key,
          name: options.name ?? "Intervoo Diagnostics",
          order_id: options.orderId,
          theme: options.theme,
        });

        checkout.open();
      },
    }),
    [error, isReady],
  );

  return (
    <RazorpayContext.Provider value={value}>
      <Script
        src={RAZORPAY_CHECKOUT_SRC}
        strategy="lazyOnload"
        onLoad={() => {
          setIsReady(true);
          setError(null);
        }}
        onError={() => {
          setIsReady(false);
          setError("Failed to load Razorpay checkout.");
        }}
      />
      {children}
    </RazorpayContext.Provider>
  );
}

export function useRazorpay() {
  const context = useContext(RazorpayContext);
  if (!context) {
    throw new Error("useRazorpay must be used within RazorpayProvider");
  }
  return context;
}
