"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { IntervooLogo } from "@/components/login/intervoo-logo";
import { OtpForm } from "@/components/login/otp-form";
import { PhoneNumberForm } from "@/components/login/phone-number-form";

import { authClient } from "@/lib/auth-client";
import { isLocalPhoneNumberComplete, toE164PhoneNumber } from "@/lib/phone";

type LoginStep = "phone" | "otp" | "success";

export default function LoginPage() {
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
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="flex w-full max-w-xs flex-col gap-8">
        <a href="/" className="flex flex-col items-center gap-3 font-medium">
          <IntervooLogo className="h-8" />
          <span className="text-[1.35rem] font-bold font-sans tracking-tight">
            Welcome to Intervoo.ai
          </span>
        </a>

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
  );
}
