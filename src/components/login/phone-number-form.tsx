import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { FIXED_COUNTRY_CODE, normalizeLocalPhoneNumber } from "@/lib/phone";
import { Spinner } from "../ui/spinner";

type PhoneNumberFormProps = {
  phone: string;
  error: string;
  loading: boolean;
  onPhoneChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function PhoneNumberForm({
  phone,
  error,
  loading,
  onPhoneChange,
  onSubmit,
}: PhoneNumberFormProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="text-xl font-bold tracking-tight mb-4">Sign Up</h1>
        <h2 className="text-base font-medium">Whatsapp Number</h2>
        <p className="text-[12px] text-muted-foreground text-center">
          We&apos;ll send a one-time code to your WhatsApp.
        </p>
      </div>

      <form onSubmit={onSubmit}>
        <FieldGroup className="gap-5">
          <Field>
            <InputGroup className="h-11 font-medium">
              <InputGroupAddon className="border-r pr-2.5">
                <InputGroupText className="text-base">
                  {FIXED_COUNTRY_CODE}
                </InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                placeholder="9876543210"
                required
                autoFocus={true}
                disabled={loading}
                value={phone}
                onChange={(event) => {
                  onPhoneChange(normalizeLocalPhoneNumber(event.target.value));
                }}
              />
            </InputGroup>
          </Field>

          {error ? <FieldError>{error}</FieldError> : null}

          <Field>
            <Button
              type="submit"
              disabled={loading}
              className="h-11 text-sm bg-button"
            >
              {loading ? <Spinner /> : "Submit"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
