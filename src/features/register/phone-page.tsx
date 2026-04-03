import type { FormEvent } from "react";
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
    <section className="relative min-h-screen bg-[linear-gradient(180deg,#0B061E_0%,#3C2390_100%)] shadow-[0_24px_54px_rgba(0,0,0,0.26)]">
      <div className="flex flex-col justify-between min-h-screen">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
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

          <form
            className="mt-6 flex w-full flex-col gap-4"
            onSubmit={props.onSubmit}
          >
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
                    props.onPhoneChange(
                      normalizeLocalPhoneNumber(event.target.value),
                    )
                  }
                />
              </div>
            </label>

            <button
              className="mx-auto mt-2 w-fit px-14 py-4 rounded-full bg-[linear-gradient(90deg,#4F33A3_0%,#6A4DF5_100%)] text-base font-medium tracking-[-0.01em] text-white shadow-[0_12px_24px_rgba(93,72,220,0.28)] transition disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
              disabled={props.loading}
              type="submit"
            >
              {props.loading ? "Sending OTP..." : "Get OTP"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
