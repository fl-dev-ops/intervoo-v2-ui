import type { FormEvent } from "react";
import { OtpCodeField } from "#/components/otp-code-field";
import { Button } from "#/components/ui/button";
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
    <section className="relative min-h-screen">
      {/* Desktop: centered card */}
      <div className="hidden min-h-screen md:flex md:items-center md:justify-center md:px-6  text-center">
        <div className="w-full max-w-110 ">
          <div className="space-y-3">
            <img alt="Intervoo" className="mx-auto h-10" src="/intervoo-logo-light.svg" />
            <div className="text-2xl font-medium text-white font-figtree tracking-wider">
              Intervoo.ai
            </div>
            <p className="mt-6 mb-8 text-[16px] text-gray-500 font-medium">
              Speak better. Interview better.
              <br /> With India-trained voice AI.
            </p>
          </div>

          <div className="relative mt-20">
            {/* Glitter sparkle effect */}
            <img
              alt=""
              aria-hidden
              className="pointer-events-none absolute -top-30 left-0 w-[inherit] z-0 scale-150"
              src="/glitter.svg"
            />
            <div className="z-10 bg-white relative px-8 pt-10 pb-10 shadow-xl rounded-4xl ">
              <h2 className="text-[20px] font-bold text-[#17131f]">Verify your number</h2>
              <p className="mt-2 text-[12px] font-light text-[#8f89a0]">
                Enter the OTP sent to {formatPhoneNumberForDisplay(props.phone)}
              </p>

              {props.error ? (
                <div className="mt-4 w-full rounded-[0.85rem] border border-[rgba(225,93,93,0.14)] bg-[rgba(225,93,93,0.08)] px-3.5 py-3 text-[0.8rem] text-[#c45252]">
                  {props.error}
                </div>
              ) : null}

              <form className="mt-6 flex w-full flex-col gap-5" onSubmit={props.onSubmit}>
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
                    <Button
                      size="lg"
                      disabled={props.loading}
                      variant="ghost"
                      type="button"
                      onClick={props.onResend}
                    >
                      <IconReload className="h-4 w-4" /> Resend code
                    </Button>
                  </div>
                )}

                <Button
                  className="mx-auto my-2 w-fit px-14 py-4 text-base tracking-[-0.01em] disabled:shadow-none"
                  disabled={props.loading || props.otp.length !== 6}
                  type="submit"
                >
                  {props.loading ? "Verifying..." : "Verify & Continue"}
                </Button>
              </form>

              <div className="mt-4 flex flex-col gap-1 text-center">
                <strong className="text-[0.96rem] text-[#242031]">
                  Didn&apos;t receive the OTP?
                </strong>
                <span className="text-[0.8rem] leading-[1.55] text-[#9993a8]">
                  Ensure your number is active on WhatsApp and connected to the internet.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: gradient top + white sheet bottom */}
      <div className="flex flex-col justify-between h-screen md:hidden overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3">
          <Button
            className="absolute top-4 left-4 h-10 w-10 bg-white/15 text-[1.1rem] text-white hover:bg-white/20"
            size="icon"
            variant="ghost"
            type="button"
            onClick={props.onBack}
          >
            ←
          </Button>
          <img alt="Intervoo" className="mx-auto h-10" src="/intervoo-logo-light.svg" />
          <div className="text-2xl font-medium text-white font-figtree tracking-wider">
            Intervoo.ai
          </div>
          <p className="my-4 text-[16px] text-gray-500 font-medium">
            Speak better. Interview better.
            <br /> With India-trained voice AI.
          </p>
        </div>

        <div className="relative">
          {/* Glitter sparkle effect */}
          <img
            alt=""
            aria-hidden
            className="pointer-events-none absolute -top-30 left-0 w-[inherit] z-0 scale-150"
            src="/glitter.svg"
          />
          <div className="relative z-10 flex-0 flex flex-col items-center rounded-t-4xl bg-[#faf9fc] px-8 pt-8 pb-10 text-center">
            <h2 className="text-[20px] font-bold text-[#17131f]">Verify your number</h2>
            <p className="mt-2 text-[12px] font-light text-[#8f89a0]">
              Enter the OTP sent to {formatPhoneNumberForDisplay(props.phone)}
            </p>

            {props.error ? (
              <div className="mt-4 w-full rounded-[0.85rem] border border-[rgba(225,93,93,0.14)] bg-[rgba(225,93,93,0.08)] px-3.5 py-3 text-[0.8rem] text-[#c45252]">
                {props.error}
              </div>
            ) : null}

            <form className="mt-6 flex w-full flex-col gap-5" onSubmit={props.onSubmit}>
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
                  <Button
                    className="gap-x-1 px-0 text-[0.88rem] font-semibold text-gray-500"
                    disabled={props.loading}
                    variant="ghost"
                    type="button"
                    onClick={props.onResend}
                  >
                    <IconReload className="h-4 w-4" /> Resend code
                  </Button>
                </div>
              )}

              <Button
                className="mx-auto my-2 w-fit px-14 py-4 text-base tracking-[-0.01em] disabled:shadow-none"
                disabled={props.loading || props.otp.length !== 6}
                type="submit"
              >
                {props.loading ? "Verifying..." : "Verify & Continue"}
              </Button>
            </form>

            <div className="mt-auto flex flex-col gap-1 pt-6 text-center">
              <strong className="text-[0.96rem] text-[#242031]">
                Didn&apos;t receive the OTP?
              </strong>
              <span className="text-[0.8rem] leading-[1.55] text-[#9993a8]">
                Ensure your number is active on WhatsApp and connected to the internet.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
