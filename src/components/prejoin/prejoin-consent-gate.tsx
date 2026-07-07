"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PrejoinConsentLockIcon from "@/components/icons/prejoin-consent-lock.svg";
import { CustomPreJoin } from "@/components/prejoin/custom-prejoin";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

type ConsentState = "checking" | "required" | "accepted";

type PrejoinConsentGateProps = {
  diagnosticId: string;
  jobId: string;
  roundId: string;
  userId: string;
  userName: string | null;
};

const CONSENT_STORAGE_PREFIX = "intervoo:prejoin-consent";

export function PrejoinConsentGate({
  diagnosticId,
  jobId,
  roundId,
  userId,
  userName,
}: PrejoinConsentGateProps) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [consentState, setConsentState] = useState<ConsentState>("checking");
  const [storageError, setStorageError] = useState<string | null>(null);
  const storageKey = `${CONSENT_STORAGE_PREFIX}:${userId}`;

  useEffect(() => {
    try {
      setConsentState(
        window.localStorage.getItem(storageKey) === "accepted"
          ? "accepted"
          : "required",
      );
    } catch {
      setConsentState("required");
    }
  }, [storageKey]);

  function handleContinue() {
    if (!agreed) return;

    try {
      window.localStorage.setItem(storageKey, "accepted");
      setConsentState("accepted");
    } catch {
      setStorageError(
        "We could not save your preference. Enable browser storage and try again.",
      );
    }
  }

  if (consentState === "accepted") {
    return (
      <CustomPreJoin
        diagnosticId={diagnosticId}
        hideCoachSelection
        jobId={jobId}
        roundId={roundId}
        userName={userName}
      />
    );
  }

  if (consentState === "checking") {
    return <main className="min-h-dvh bg-[#F6F3F8]" />;
  }

  return (
    <main className="min-h-dvh bg-[#F6F3F8]">
      <DialogPrimitive.Root
        onOpenChange={(open) => {
          if (!open) router.back();
        }}
        open
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <DialogPrimitive.Popup className="fixed inset-x-0 bottom-0 z-50 flex max-h-[calc(100dvh-4rem)] flex-col rounded-t-[32px] bg-white outline-none data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-6 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom-6 sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:w-[476px] sm:max-w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px] sm:data-open:zoom-in-95 sm:data-closed:zoom-out-95">
            <DialogPrimitive.Close
              render={
                <Button
                  aria-label="Close"
                  className="absolute -top-14 right-1/2 translate-x-1/2 text-white hover:bg-white/10 hover:text-white sm:top-4 sm:right-4 sm:translate-x-0 sm:text-[#6D6873] sm:hover:bg-[#F4F1F6] sm:hover:text-black"
                  size="icon-sm"
                  variant="ghost"
                />
              }
            >
              <X className="size-6" />
            </DialogPrimitive.Close>

            <div className="flex min-h-0 flex-col overflow-y-auto rounded-[inherit] px-6 pb-9 pt-7 sm:p-8">
              <PrejoinConsentLockIcon
                className="mx-auto size-58"
                role="img"
                title="A lock protected by a shield"
              />

              <div className="mt-6 sm:mt-5">
                <DialogPrimitive.Title className="font-serif text-2xl font-semibold leading-tight text-black">
                  Before you setup
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-3 text-base leading-6 text-[#777379]">
                  By proceeding, you agree that your interview will be recorded,
                  and your responses will be analyzed by AI to generate your
                  interview assessment and feedback. Your data is stored
                  securely. We may use anonymized interview data to improve our
                  AI models.
                </DialogPrimitive.Description>
              </div>

              <label
                className="mt-7 flex cursor-pointer items-start gap-3 text-base font-medium leading-6 text-[#302D33]"
                htmlFor="prejoin-consent"
              >
                <Checkbox
                  checked={agreed}
                  className="mt-0.5 size-5 bg-white"
                  id="prejoin-consent"
                  onCheckedChange={(checked) => {
                    setAgreed(checked === true);
                    setStorageError(null);
                  }}
                />
                <span>
                  I agree to the <strong>Privacy Policy</strong> and{" "}
                  <strong>Terms of Service</strong>.
                </span>
              </label>

              {storageError ? (
                <p className="mt-3 text-sm text-destructive" role="alert">
                  {storageError}
                </p>
              ) : null}

              <Button
                className="mt-7 w-full"
                disabled={!agreed}
                onClick={handleContinue}
                size="lg"
                type="button"
              >
                Continue to setup
              </Button>
            </div>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </main>
  );
}
