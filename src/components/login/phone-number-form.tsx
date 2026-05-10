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
        {/*<h1 className="text-xl font-semibold tracking-tight">
          Sign in to Diagnostics
        </h1>*/}
      </div>

      <form onSubmit={onSubmit}>
        <FieldGroup className="gap-5">
          <Field>
            <InputGroup className="h-11 font-medium">
              <InputGroupAddon>
                <InputGroupText>{FIXED_COUNTRY_CODE}</InputGroupText>
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
            <p className="text-[13px] text-muted-foreground text-center">
              We&apos;ll send a one-time code to your WhatsApp.
            </p>
          </Field>

          {error ? <FieldError>{error}</FieldError> : null}

          <Field>
            <Button type="submit" disabled={loading} className="h-11 text-sm">
              {loading ? <Spinner /> : "Submit"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
