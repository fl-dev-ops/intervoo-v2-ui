import type { FormEvent } from "react";
import { OtpCodeField } from "#/components/otp-code-field";
import { formatPhoneNumberForDisplay } from "#/lib/phone";
import { IconReload } from "@tabler/icons-react";

type OtpPageProps = {
  phone: string;
  otp: string;
  error: string;
  loading: boolean;
  resendCooldown: number;
  onOtpChange: (value: string) => void;
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onResend: () => void;
};

function formatCountdown(value: number) {
  return `0:${String(value).padStart(2, "0")}`;
}

export function OtpPage(props: OtpPageProps) {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#0B061E_0%,#3C2390_100%)] shadow-[0_24px_54px_rgba(0,0,0,0.26)]">
      <div className="relative flex min-h-screen flex-col justify-between">
        <div className="relative flex-1 flex flex-col items-center justify-center px-6 text-center">
          <button
            className="absolute top-4 left-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-[1.1rem] text-white"
            type="button"
            onClick={props.onBack}
          >
            ←
          </button>
          <img
            alt="Intervoo"
            className="h-10 mb-6"
            src="/intervoo-logo-light.svg"
          />
          <div className="mt-4 text-[18px] font-medium text-white font-figtree">
            Intervoo.ai
          </div>
          <p className="mt-3 text-[14px] leading-5.5 text-white/45">
            Speak better. Interview better. With
            <br />
            India-trained voice AI
          </p>
        </div>

        <div className="flex-0 flex flex-col items-center rounded-t-4xl bg-[#faf9fc] px-8 pt-8 pb-10 text-center">
          <h2 className="text-[20px] font-bold text-[#17131f]">
            Verify your number
          </h2>
          <p className="mt-2 text-[12px] font-light text-[#8f89a0]">
            Enter the OTP sent to {formatPhoneNumberForDisplay(props.phone)}
          </p>

          {props.error ? (
            <div className="mt-4 w-full rounded-[0.85rem] border border-[rgba(225,93,93,0.14)] bg-[rgba(225,93,93,0.08)] px-3.5 py-3 text-[0.8rem] text-[#c45252]">
              {props.error}
            </div>
          ) : null}

          <form
            className="mt-6 flex w-full flex-col gap-5"
            onSubmit={props.onSubmit}
          >
            <label>
              <OtpCodeField
                className="grid grid-cols-6 gap-[0.55rem]"
                disabled={props.loading}
                inputClassName="h-12 w-full rounded-[0.82rem] border-0 bg-[#ebe5f1] text-center text-[1.08rem] font-bold text-[#201a2c] outline-none transition focus:shadow-[0_0_0_3px_rgba(94,70,221,0.14)] disabled:opacity-70"
                length={6}
                value={props.otp}
                onChange={props.onOtpChange}
              />
            </label>

            {props.resendCooldown > 0 ? (
              <p className="text-[0.88rem] font-medium text-gray-500 flex items-center justify-center gap-x-1">
                <IconReload className="h-4 w-4" /> Resend in{" "}
                {formatCountdown(props.resendCooldown)}
              </p>
            ) : (
              <div className="flex justify-center">
                <button
                  className="bg-transparent text-[0.88rem] font-semibold text-gray-500 flex items-center gap-x-1"
                  disabled={props.loading}
                  type="button"
                  onClick={props.onResend}
                >
                  <IconReload className="h-4 w-4" /> Resend code
                </button>
              </div>
            )}

            <button
              className="mx-auto my-2 w-fit px-14 py-4 rounded-full bg-[linear-gradient(90deg,#4F33A3_0%,#6A4DF5_100%)] text-base font-medium tracking-[-0.01em] text-white shadow-[0_12px_24px_rgba(93,72,220,0.28)] transition disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
              disabled={props.loading || props.otp.length !== 6}
              type="submit"
            >
              {props.loading ? "Verifying..." : "Verify & Continue"}
            </button>
          </form>

          <div className="mt-auto flex flex-col gap-1 pt-6 text-center">
            <strong className="text-[0.96rem] text-[#242031]">
              Didn&apos;t receive the OTP?
            </strong>
            <span className="text-[0.8rem] leading-[1.55] text-[#9993a8]">
              Ensure your number is active on WhatsApp and connected to the
              internet.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
