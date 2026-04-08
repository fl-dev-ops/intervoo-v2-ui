import type { FormEvent } from "react";
import { Button } from "#/components/ui/button";
import { FIXED_COUNTRY_CODE, normalizeLocalPhoneNumber } from "#/lib/phone";

type PhonePageProps = {
  phone: string;
  error: string;
  loading: boolean;
  onPhoneChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function PhonePage(props: PhonePageProps) {
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
              <h2 className="text-[20px] font-bold">Signup</h2>
              <div className="mt-4 text-[14px] font-medium">WhatsApp Number</div>
              <p className="mt-2 text-[14px] font-light text-gray-600">
                We&apos;ll send a 6 digit code to verify your number
              </p>

              {props.error ? (
                <div className="mt-4 w-full rounded-[0.85rem] border border-[rgba(225,93,93,0.14)] bg-[rgba(225,93,93,0.08)] px-3.5 py-3 text-[0.8rem] text-[#c45252]">
                  {props.error}
                </div>
              ) : null}

              <form className="mt-6 flex w-full flex-col gap-4" onSubmit={props.onSubmit}>
                <label>
                  <div className="flex h-12 w-full items-center rounded-[0.9rem] border border-transparent bg-[#ece7f2] px-3.5 transition focus-within:border-[rgba(94,70,221,0.28)] focus-within:shadow-[0_0_0_4px_rgba(94,70,221,0.10)]">
                    <span className="text-[16px] font-semibold text-[#2d2838]">
                      {FIXED_COUNTRY_CODE}
                    </span>
                    <input
                      className="h-full flex-1 border-0 bg-transparent pl-2 font-inherit text-[16px] text-[#201a2c] outline-none"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder=""
                      required
                      type="tel"
                      value={props.phone}
                      onChange={(event) =>
                        props.onPhoneChange(normalizeLocalPhoneNumber(event.target.value))
                      }
                    />
                  </div>
                </label>

                <Button size="lg" disabled={props.loading} type="submit">
                  {props.loading ? "Sending OTP..." : "Get OTP"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: gradient top + white sheet bottom */}
      <div className="flex flex-col justify-between h-screen md:hidden overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3">
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
            <h2 className="text-[20px] font-bold ">Signup</h2>
            <div className="mt-4 text-[14px] font-medium ">WhatsApp Number</div>
            <p className="mt-2 text-[14px] font-light text-gray-600">
              We&apos;ll send a 6 digit code to verify your number
            </p>

            {props.error ? (
              <div className="mt-4 w-full rounded-[0.85rem] border border-[rgba(225,93,93,0.14)] bg-[rgba(225,93,93,0.08)] px-3.5 py-3 text-[0.8rem] text-[#c45252]">
                {props.error}
              </div>
            ) : null}

            <form className="mt-6 flex w-full flex-col gap-4" onSubmit={props.onSubmit}>
              <label>
                <div className="flex h-12 w-full items-center rounded-[0.9rem] border border-transparent bg-[#ece7f2] px-3.5 transition focus-within:border-[rgba(94,70,221,0.28)] focus-within:shadow-[0_0_0_4px_rgba(94,70,221,0.10)]">
                  <span className="text-[16px] font-semibold text-[#2d2838]">
                    {FIXED_COUNTRY_CODE}
                  </span>
                  <input
                    className="h-full flex-1 border-0 bg-transparent pl-2 font-inherit text-[16px] text-[#201a2c] outline-none"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder=""
                    required
                    type="tel"
                    value={props.phone}
                    onChange={(event) =>
                      props.onPhoneChange(normalizeLocalPhoneNumber(event.target.value))
                    }
                  />
                </div>
              </label>

              <Button
                className="mx-auto mt-2 w-fit px-14 py-4 text-base tracking-[-0.01em] disabled:shadow-none"
                disabled={props.loading}
                type="submit"
              >
                {props.loading ? "Sending OTP..." : "Get OTP"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
