"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { isLocalPhoneNumberComplete, toE164PhoneNumber } from "@/lib/phone";
import { IntervooLogo } from "./intervoo-logo";
import { OtpForm } from "./otp-form";
import { PhoneNumberForm } from "./phone-number-form";

type LoginStep = "phone" | "otp" | "success";

export function LoginPageClient() {
  const [step, setStep] = useState<LoginStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (step !== "success") {
      return;
    }

    const timeoutId = setTimeout(() => {
      window.location.href = "/";
    }, 600);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [step]);

  function startCooldown() {
    setResendCooldown(38);

    if (cooldownRef.current) {
      clearInterval(cooldownRef.current);
    }

    cooldownRef.current = setInterval(() => {
      setResendCooldown((current) => {
        if (current <= 1) {
          if (cooldownRef.current) {
            clearInterval(cooldownRef.current);
          }

          return 0;
        }

        return current - 1;
      });
    }, 1000);
  }

  async function sendOtp() {
    if (!isLocalPhoneNumberComplete(phone)) {
      setError("Enter a valid 10-digit WhatsApp number.");
      return false;
    }

    const { error: otpError } = await authClient.phoneNumber.sendOtp({
      phoneNumber: toE164PhoneNumber(phone),
    });

    if (otpError) {
      setError(otpError.message ?? "Failed to send OTP.");
      return false;
    }

    setOtp("");
    setStep("otp");
    startCooldown();
    return true;
  }

  async function handlePhoneSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await sendOtp();
    } catch {
      setError("Something went wrong while sending the code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: verifyError } = await authClient.phoneNumber.verify({
        phoneNumber: toE164PhoneNumber(phone),
        code: otp,
      });

      if (verifyError) {
        setError(verifyError.message ?? "Verification failed.");
        return;
      }

      setStep("success");
    } catch {
      setError("Something went wrong while verifying the code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      await sendOtp();
    } catch {
      setError("Something went wrong while sending the code.");
    } finally {
      setLoading(false);
    }
  }

  function handleChangeNumber() {
    setStep("phone");
    setOtp("");
    setError("");
  }

  return (
    <main className="flex min-h-dvh p-3 md:p-10">
      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center space-y-8">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 font-medium md:flex-0">
          <a href="/" className="flex flex-col items-center gap-3">
            <IntervooLogo className="h-10 text-white" />
            <p className="font-sans text-2xl font-bold tracking-tight text-white">
              Intervoo.ai
            </p>
          </a>
          <span className="mx-auto max-w-xs text-center text-sm leading-6 text-gray-400">
            Speak better. Interview better. <br /> With India-trained voice AI.
          </span>
        </div>

        <div className="w-full rounded-2xl bg-card px-3 pt-5 pb-3 md:p-5">
          {step === "phone" && (
            <PhoneNumberForm
              phone={phone}
              error={error}
              loading={loading}
              onPhoneChange={setPhone}
              onSubmit={handlePhoneSubmit}
            />
          )}

          {step === "otp" && (
            <OtpForm
              phone={phone}
              otp={otp}
              error={error}
              loading={loading}
              resendCooldown={resendCooldown}
              onOtpChange={setOtp}
              onChangeNumber={handleChangeNumber}
              onResend={handleResend}
              onSubmit={handleOtpSubmit}
            />
          )}

          {step === "success" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <h1 className="text-xl font-semibold tracking-tight">
                You&apos;re in
              </h1>
              <p className="text-sm text-muted-foreground">
                Redirecting you now...
              </p>
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
