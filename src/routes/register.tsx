import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { OtpCodeField } from "#/components/otp-code-field";
import { authClient } from "#/lib/auth-client";
import { getSession } from "#/lib/auth.functions";
import {
  FIXED_COUNTRY_CODE,
  formatPhoneNumberForDisplay,
  isLocalPhoneNumberComplete,
  normalizeLocalPhoneNumber,
  toE164PhoneNumber,
} from "#/lib/phone";

export const Route = createFileRoute("/register")({
  beforeLoad: async () => {
    const session = await getSession();

    if (session?.user) {
      throw redirect({
        to: session.user.hasCompletedOnboarding ? "/" : "/onboarding",
      });
    }
  },
  component: RegisterPage,
});

const shellClassName =
  "mx-auto flex min-h-screen w-full max-w-[420px] flex-col gap-4 px-4 py-6 sm:px-0";
const cardClassName =
  "rounded-3xl border border-slate-800/90 bg-slate-950/85 p-5 text-slate-100 shadow-[0_28px_60px_rgba(2,6,23,0.55)]";
const primaryButtonClassName =
  "inline-flex h-12 w-full items-center justify-center rounded-2xl border border-amber-300/50 bg-amber-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60";
const ghostButtonClassName =
  "inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";

function RegisterPage() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current);
      }
    };
  }, []);

  function startCooldown() {
    setResendCooldown(38);
    if (cooldownRef.current) {
      clearInterval(cooldownRef.current);
    }

    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) {
            clearInterval(cooldownRef.current);
          }

          return 0;
        }

        return prev - 1;
      });
    }, 1000);
  }

  async function sendOtp() {
    if (!isLocalPhoneNumberComplete(phone)) {
      setError("Enter a valid 10-digit mobile number.");
      return false;
    }

    const { error: otpError } = await authClient.phoneNumber.sendOtp({
      phoneNumber: toE164PhoneNumber(phone),
    });

    if (otpError) {
      setError(otpError.message ?? "Failed to send OTP");
      return false;
    }

    startCooldown();
    setStep("otp");
    return true;
  }

  async function handlePhoneSubmit(event: React.FormEvent) {
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

  async function handleOtpSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: verifyError } = await authClient.phoneNumber.verify({
        phoneNumber: toE164PhoneNumber(phone),
        code: otp,
      });

      if (verifyError) {
        setError(verifyError.message ?? "Verification failed");
        return;
      }

      window.location.href = "/onboarding";
    } catch {
      setError("Something went wrong while verifying the code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_32%),radial-gradient(circle_at_left_bottom,rgba(56,189,248,0.16),transparent_24%),linear-gradient(180deg,#020617,#0f172a)] px-3 font-['Sora',sans-serif] text-slate-100">
      <div className={shellClassName}>
        <div className="flex items-center justify-between px-1 text-xs font-semibold text-slate-400">
          <span className="font-mono text-slate-200">9:41</span>
          <span>New account</span>
        </div>

        <section className={cardClassName}>
          <div className="inline-flex rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-300">
            Step {step === "phone" ? "1" : "2"} of 2
          </div>
          <h2 className="mt-3 text-lg font-semibold text-slate-50">
            {step === "phone" ? (
              <>
                Enter your <em className="not-italic text-amber-300">mobile number</em>
              </>
            ) : (
              <>
                Verify your <em className="not-italic text-amber-300">OTP</em>
              </>
            )}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {step === "phone"
              ? "We will send a one-time code to verify your number."
              : `We sent a 6-digit code to ${formatPhoneNumberForDisplay(phone)}.`}
          </p>

          <div className="mt-5 space-y-4">
            {error ? (
              <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            {step === "phone" ? (
              <form className="space-y-4" onSubmit={handlePhoneSubmit}>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    WhatsApp number
                  </span>
                  <div className="flex h-12 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 focus-within:border-amber-300 focus-within:ring-2 focus-within:ring-amber-300/30">
                    <span className="inline-flex items-center border-r border-slate-700 px-3 text-sm font-medium text-slate-300">
                      {FIXED_COUNTRY_CODE}
                    </span>
                    <input
                      className="h-full w-full bg-transparent px-3 text-sm text-slate-100 outline-none"
                      id="phone"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="9876543210"
                      required
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(normalizeLocalPhoneNumber(event.target.value))}
                    />
                  </div>
                  <span className="text-xs text-slate-400">
                    {FIXED_COUNTRY_CODE} is fixed and will be added automatically.
                  </span>
                </label>

                <div>
                  <button className={primaryButtonClassName} disabled={loading} type="submit">
                    {loading ? "Sending OTP..." : "Continue"}
                  </button>
                </div>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleOtpSubmit}>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Verification code
                  </span>
                  <OtpCodeField disabled={loading} value={otp} onChange={setOtp} />
                </label>

                <div className="space-y-3">
                  <button
                    className={primaryButtonClassName}
                    disabled={loading || otp.length !== 6}
                    type="submit"
                  >
                    {loading ? "Verifying..." : "Verify & continue"}
                  </button>
                  <button
                    className={ghostButtonClassName}
                    disabled={loading}
                    type="button"
                    onClick={() => {
                      setStep("phone");
                      setOtp("");
                      setError("");
                    }}
                  >
                    Edit phone number
                  </button>
                </div>

                {resendCooldown > 0 ? (
                  <p className="text-center text-xs font-medium text-slate-400">
                    Resend available in {formatCountdown(resendCooldown)}
                  </p>
                ) : (
                  <div className="flex justify-center">
                    <button
                      className="text-sm font-medium text-amber-300 underline-offset-2 hover:underline"
                      disabled={loading}
                      type="button"
                      onClick={handleResend}
                    >
                      Resend code
                    </button>
                  </div>
                )}
              </form>
            )}

            <div className="pt-1 text-center text-sm text-slate-400">
              Already have an account?{" "}
              <a
                className="font-medium text-amber-300 underline-offset-2 hover:underline"
                href="/login"
              >
                Sign in
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function formatCountdown(value: number) {
  const seconds = String(value).padStart(2, "0");
  return `0:${seconds}`;
}
