import { useEffect, useRef, useState } from "react";
import { authClient } from "#/lib/auth-client";
import { isLocalPhoneNumberComplete, toE164PhoneNumber } from "#/lib/phone";
import { AccountCreatedPage } from "./account-created-page";
import { OtpPage } from "./otp-page";
import { PhonePage } from "./phone-page";

type RegisterStep = "phone" | "otp" | "created";

export function RegisterFlow() {
  const [step, setStep] = useState<RegisterStep>("phone");
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

  async function handlePhoneSubmit(event: React.FormEvent<HTMLFormElement>) {
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

  async function handleOtpSubmit(event: React.FormEvent<HTMLFormElement>) {
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

      setStep("created");
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
    <main className="min-h-screen bg-[#464646] px-3 py-3 font-['Sora',system-ui,sans-serif]">
      <div className="mx-auto flex min-h-[calc(100dvh-1.5rem)] w-full max-w-[392px] flex-col">
        {step === "phone" ? (
          // <PhonePage
          //   error={error}
          //   loading={loading}
          //   phone={phone}
          //   onPhoneChange={setPhone}
          //   onSubmit={handlePhoneSubmit}
          // />
          <AccountCreatedPage
            onContinue={() => {
              window.location.href = "/onboarding";
            }}
          />
        ) : null}

        {step === "otp" ? (
          <OtpPage
            error={error}
            loading={loading}
            otp={otp}
            phone={phone}
            resendCooldown={resendCooldown}
            onBack={() => {
              setStep("phone");
              setOtp("");
              setError("");
            }}
            onOtpChange={setOtp}
            onResend={handleResend}
            onSubmit={handleOtpSubmit}
          />
        ) : null}

        {step === "created" ? (
          <AccountCreatedPage
            onContinue={() => {
              window.location.href = "/onboarding";
            }}
          />
        ) : null}
      </div>
    </main>
  );
}
