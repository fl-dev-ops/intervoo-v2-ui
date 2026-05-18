import { PenLineIcon } from "lucide-react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { IconRotate } from "@tabler/icons-react";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { formatPhoneNumberForDisplay } from "@/lib/phone";
import { Spinner } from "../ui/spinner";

type OtpFormProps = {
  phone: string;
  otp: string;
  error: string;
  loading: boolean;
  resendCooldown: number;
  onOtpChange: (value: string) => void;
  onChangeNumber: () => void;
  onResend: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function formatCountdown(value: number) {
  return `0:${String(value).padStart(2, "0")}`;
}

export function OtpForm({
  phone,
  otp,
  error,
  loading,
  resendCooldown,
  onOtpChange,
  onChangeNumber,
  onResend,
  onSubmit,
}: OtpFormProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          Enter verification code
        </h1>
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit code to{" "}
          <button
            type="button"
            className="block text-center text-base font-semibold w-full my-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={onChangeNumber}
          >
            {formatPhoneNumberForDisplay(phone)}
            <PenLineIcon className="inline-block w-4 h-4 ml-2" />
          </button>
        </p>
      </div>

      <form onSubmit={onSubmit}>
        <FieldGroup className="gap-5">
          <Field>
            <InputOTP
              id="otp"
              maxLength={6}
              value={otp}
              disabled={loading}
              containerClassName="justify-center"
              onChange={onOtpChange}
              autoFocus
            >
              <InputOTPGroup className="gap-2 border-0">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <InputOTPSlot
                    key={`otp-slot-${index}`}
                    index={index}
                    className="size-12 rounded-md border text-xl font-semibold"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <div className="text-sm text-center">
              <button
                type="button"
                className="text-muted-foreground text-sm underline-offset-4 hover:text-foreground my-4 font-semibold"
                disabled={loading || resendCooldown > 0}
                onClick={onResend}
              >
                <IconRotate className="size-5 inline-block mr-2" />
                {resendCooldown > 0
                  ? formatCountdown(resendCooldown)
                  : "Resend code"}
              </button>
            </div>
          </Field>
          {/*{error ? <FieldError>{error}</FieldError> : null}*/}
          <div className="w-full">
            <Button
              size={"lg"}
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-button rounded-full"
            >
              {loading ? <Spinner /> : "Verify & Continue"}
            </Button>
          </div>
          <div className="text-center mt-3">
            <h3 className="text-sm font-semibold mb-2">
              {" "}
              Didn’t receive the OTP?
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Ensure your number is active on WhatsApp and connected to the
              internet.
            </p>
          </div>
        </FieldGroup>
      </form>
    </div>
  );
}
