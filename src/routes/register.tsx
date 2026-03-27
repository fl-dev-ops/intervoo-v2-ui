import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { OtpCodeField } from "#/components/otp-code-field";
import { authClient } from "#/lib/auth-client";
import { getSession } from "#/lib/auth.functions";

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
    const { error: otpError } = await authClient.phoneNumber.sendOtp({
      phoneNumber: phone,
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
        phoneNumber: phone,
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
    <main className="app-screen">
      <div className="mobile-shell">
        <div className="status-row">
          <span className="status-time">9:41</span>
          <span className="status-meta">New account</span>
        </div>

        <section className="content-card" style={{ marginTop: "16px" }}>
          <div className="journey-pill">Step {step === "phone" ? "1" : "2"} of 2</div>
          <h2 className="section-title">
            {step === "phone" ? (
              <>
                Enter your <em>mobile number</em>
              </>
            ) : (
              <>
                Verify your <em>OTP</em>
              </>
            )}
          </h2>
          <p className="section-copy">
            {step === "phone"
              ? "We will send a one-time code to verify your number."
              : `We sent a 6-digit code to ${phone}.`}
          </p>

          <div className="content-stack">
            {error ? <div className="alert alert-danger">{error}</div> : null}

            {step === "phone" ? (
              <form className="page-form" onSubmit={handlePhoneSubmit}>
                <label className="field-stack">
                  <span className="field-label">WhatsApp number</span>
                  <div className="input-prefix-shell">
                    <span className="input-prefix-label">Intl</span>
                    <input
                      className="text-input"
                      id="phone"
                      placeholder="+91 98765 43210"
                      required
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  </div>
                  <span className="helper-copy">We only use this number for authentication.</span>
                </label>

                <div className="button-row">
                  <button className="primary-button" disabled={loading} type="submit">
                    {loading ? "Sending OTP..." : "Continue"}
                  </button>
                </div>
              </form>
            ) : (
              <form className="page-form" onSubmit={handleOtpSubmit}>
                <label className="field-stack">
                  <span className="field-label">Verification code</span>
                  <OtpCodeField disabled={loading} value={otp} onChange={setOtp} />
                </label>

                <div className="button-row">
                  <button
                    className="primary-button"
                    disabled={loading || otp.length !== 6}
                    type="submit"
                  >
                    {loading ? "Verifying..." : "Verify & continue"}
                  </button>
                  <button
                    className="ghost-button"
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
                  <p className="countdown-copy">
                    Resend available in {formatCountdown(resendCooldown)}
                  </p>
                ) : (
                  <div className="support-actions">
                    <button
                      className="text-link-button"
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

            <div className="support-actions">
              <p className="muted-copy">
                Already have an account?{" "}
                <a className="support-link" href="/login">
                  Sign in
                </a>
              </p>
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
