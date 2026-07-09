"use client";

import { Check, ChevronUp, LoaderCircle, Lock, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useRazorpay } from "@/components/payments/razorpay-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type CouponValidationResponse,
  useCreatePaymentOrder,
  useUnlockWithCoupon,
  useValidateCoupon,
  useVerifyPayment,
} from "@/hooks/payments/hooks";
import { useMediaQuery } from "@/hooks/use-media-query";
import { DIAGNOSTIC_ROUNDS } from "@/lib/diagnostics/rounds-config";
import { cn } from "@/lib/utils";

type DiagnosticUnlockDialogProps = {
  className?: string;
  completedRoundIds?: string[];
  diagnosticId: string;
  jobId: string;
};

const ORIGINAL_AMOUNT = 29_900;

export function DiagnosticUnlockDialog({
  className,
  completedRoundIds = [],
  diagnosticId,
  jobId,
}: DiagnosticUnlockDialogProps) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <>
      <Button
        className={className}
        onClick={() => setOpen(true)}
        size="lg"
        type="button"
      >
        Pay ₹299 to unlock
      </Button>
      {isDesktop ? (
        <Dialog disablePointerDismissal open={open} onOpenChange={setOpen}>
          <DialogContent className="overflow-hidden rounded-[1.6rem] bg-white p-0 sm:max-w-[64rem]">
            <DialogHeader className="sr-only">
              <DialogTitle>Unlock this JD</DialogTitle>
              <DialogDescription>
                Upgrade to unlock all interview rounds for this JD.
              </DialogDescription>
            </DialogHeader>
            <UnlockContent
              completedRoundIds={completedRoundIds}
              diagnosticId={diagnosticId}
              jobId={jobId}
              onClose={() => setOpen(false)}
              variant="desktop"
            />
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer
          disablePointerDismissal
          open={open}
          onOpenChange={setOpen}
          showSwipeHandle={false}
        >
          <DrawerContent className="max-h-full rounded-t-[1.6rem]! border-0">
            <DrawerHeader className="sr-only">
              <DrawerTitle>Unlock this JD</DrawerTitle>
              <DrawerDescription>
                Upgrade to unlock all interview rounds for this JD.
              </DrawerDescription>
            </DrawerHeader>
            <UnlockContent
              completedRoundIds={completedRoundIds}
              diagnosticId={diagnosticId}
              jobId={jobId}
              onClose={() => setOpen(false)}
              variant="mobile"
            />
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}

function UnlockContent({
  completedRoundIds,
  diagnosticId,
  jobId,
  onClose,
  variant,
}: {
  completedRoundIds: string[];
  diagnosticId: string;
  jobId: string;
  onClose: () => void;
  variant: "desktop" | "mobile";
}) {
  const router = useRouter();
  const { error: sdkError, isReady, openCheckout } = useRazorpay();
  const validateCouponMutation = useValidateCoupon();
  const orderMutation = useCreatePaymentOrder();
  const verifyMutation = useVerifyPayment();
  const unlockMutation = useUnlockWithCoupon();
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] =
    useState<CouponValidationResponse | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const isApplyingCoupon = validateCouponMutation.isPending;
  const isPaying = orderMutation.isPending || unlockMutation.isPending;

  const completedRoundSet = useMemo(
    () => new Set(completedRoundIds),
    [completedRoundIds],
  );
  const amount = appliedCoupon?.finalAmount ?? ORIGINAL_AMOUNT;

  async function applyCoupon() {
    const code = couponCode.trim().toUpperCase();
    if (!code || isApplyingCoupon) return;

    setCouponError(null);
    try {
      const result = await validateCouponMutation.mutateAsync({
        code,
        diagnosticId,
        jobId,
      });
      setAppliedCoupon(result);
      setCouponCode(result.code);
      toast.success("Coupon applied");
    } catch (error) {
      setAppliedCoupon(null);
      setCouponError(getErrorMessage(error));
    }
  }

  async function handlePay() {
    if (isPaying) return;
    if (amount > 0 && !isReady) {
      toast.error(
        sdkError ?? "Payment checkout is still loading. Please try again.",
      );
      return;
    }

    try {
      if (amount <= 0 && appliedCoupon) {
        await unlockMutation.mutateAsync({
          code: appliedCoupon.code,
          diagnosticId,
          jobId,
        });
        toast.success("Diagnostic unlocked");
        onClose();
        router.refresh();
        return;
      }

      const order = await orderMutation.mutateAsync({
        couponCode: appliedCoupon?.code,
        diagnosticId,
        jobId,
      });

      openCheckout({
        amount: order.amount,
        currency: order.currency,
        key: order.key,
        name: "Intervoo Diagnostics",
        onSuccess: async (response) => {
          try {
            await verifyMutation.mutateAsync(
              response as unknown as Record<string, unknown>,
            );
            toast.success("Diagnostic unlocked");
            onClose();
            router.refresh();
          } catch (error) {
            toast.error(getErrorMessage(error));
          }
        },
        orderId: order.razorpayOrderId,
        theme: { color: "#6C47FF" },
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div
      className={cn(
        variant === "desktop"
          ? "grid min-h-[42rem] grid-cols-[1fr_0.95fr]"
          : "max-h-[92vh] overflow-y-auto",
      )}
    >
      <section
        className={cn(
          "relative overflow-hidden bg-[radial-gradient(circle_at_20%_0%,#2b155f_0%,#14083a_45%,#5f35d6_100%)] text-white",
          variant === "desktop" ? "p-8" : "rounded-t-[1.6rem] p-6",
        )}
      >
        <button
          aria-label="Close"
          className="absolute right-5 top-5 text-white/70 transition hover:text-white md:hidden"
          onClick={onClose}
          type="button"
        >
          <X className="size-5" />
        </button>
        <span className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white">
          <Check className="size-4" />
          Screening Round Completed
        </span>
        <h2 className="mt-6 font-serif text-2xl font-bold leading-tight md:text-3xl">
          Unlock this JD
        </h2>
        <p className="mt-2 text-lg text-white/70">
          Upgrade to see where you truly stand.
        </p>

        <div
          className={cn(
            "space-y-3",
            variant === "desktop" ? "mt-24" : "mt-8 hidden",
          )}
        >
          {DIAGNOSTIC_ROUNDS.map((round, index) => (
            <RoundUnlockRow
              key={round.id}
              completed={completedRoundSet.has(round.id)}
              roundNumber={index + 1}
              title={round.title}
              duration={round.duration}
            />
          ))}
        </div>

        {variant === "mobile" ? (
          <div className="mt-7">
            <p className="text-4xl font-black">{formatPrice(amount)}</p>
            {appliedCoupon ? (
              <p className="mt-2 text-sm text-white/65">
                Coupon {appliedCoupon.code} applied. You saved{" "}
                {formatPrice(appliedCoupon.discountAmount)}.
              </p>
            ) : (
              <p className="mt-2 text-sm text-white/65">
                One-time payment . No subscription
              </p>
            )}
          </div>
        ) : null}
      </section>

      <section
        className={cn("bg-white", variant === "desktop" ? "p-8" : "p-6")}
      >
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-black uppercase tracking-tight text-black">
            What you'll get
          </h3>
        </div>

        <div className="mt-6 aspect-video rounded-3xl bg-[#F0EFF0]" />

        {variant === "desktop" ? (
          <div className="mt-8 text-center">
            <p className="text-4xl font-black text-[#242225]">
              {formatPrice(amount)}
            </p>
            {appliedCoupon ? (
              <p className="mt-2 text-sm text-[#8B858E]">
                Coupon {appliedCoupon.code} applied. You saved{" "}
                {formatPrice(appliedCoupon.discountAmount)}.
              </p>
            ) : (
              <p className="mt-2 text-sm text-[#8B858E]">
                One-time payment . No subscription
              </p>
            )}
          </div>
        ) : null}

        <div className="mt-7 text-center">
          <button
            className="inline-flex items-center gap-1 text-sm font-bold text-[#5E3FE1]"
            onClick={() => setCouponOpen((current) => !current)}
            type="button"
          >
            Have a coupon code?
            <ChevronUp
              className={cn("size-4 transition", !couponOpen && "rotate-180")}
            />
          </button>
          {couponOpen ? (
            <div className="mt-4 text-left">
              <Label className="sr-only" htmlFor="coupon-code">
                Coupon code
              </Label>
              <div className="flex rounded-xl bg-[#F7F5F8] p-1">
                <Input
                  className="h-10 flex-1 border-0 bg-transparent text-sm uppercase shadow-none focus-visible:ring-0"
                  id="coupon-code"
                  onChange={(event) => {
                    setCouponCode(event.target.value.toUpperCase());
                    setAppliedCoupon(null);
                    setCouponError(null);
                  }}
                  placeholder="Enter code"
                  value={couponCode}
                />
                <Button
                  className="h-10 rounded-lg bg-white px-4 text-[#5E3FE1] shadow-sm hover:bg-white"
                  disabled={isApplyingCoupon || !couponCode.trim()}
                  onClick={applyCoupon}
                  type="button"
                  variant="secondary"
                >
                  {isApplyingCoupon ? "..." : "Submit"}
                </Button>
              </div>
              {couponError ? (
                <p className="mt-2 text-xs font-medium text-red-500">
                  {couponError}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-7 space-y-4">
          <Button
            className="h-14 w-full rounded-full bg-[linear-gradient(90deg,#5634BD_0%,#7047FF_100%)] text-base font-bold text-white"
            disabled={isPaying}
            onClick={handlePay}
            type="button"
          >
            {isPaying ? (
              <>
                <LoaderCircle className="mr-2 size-4 animate-spin" />
                Preparing...
              </>
            ) : amount <= 0 ? (
              "Unlock this JD"
            ) : (
              "Pay for this JD"
            )}
          </Button>
          <Button
            className="h-14 w-full rounded-full border-[#6C47FF] bg-white text-base font-bold text-[#5E41CF] hover:bg-[#F6F3FF] hover:text-[#5E41CF]"
            onClick={() => router.push("/jobs")}
            type="button"
            variant="outline"
          >
            Choose new JD before pay
          </Button>
          <p className="text-center text-sm text-[#807A83]">
            🔒 Secure payment
          </p>
        </div>
      </section>
    </div>
  );
}

function RoundUnlockRow({
  completed,
  duration,
  roundNumber,
  title,
}: {
  completed: boolean;
  duration: string;
  roundNumber: number;
  title: string;
}) {
  return (
    <div className="grid grid-cols-[2.5rem_1fr] items-center gap-3">
      <div
        className={cn(
          "grid size-9 place-items-center rounded-full border",
          completed
            ? "border-[#5DDC45] bg-[#5DDC45] text-white"
            : "border-white/15 bg-white/5 text-white/35",
        )}
      >
        {completed ? <Check className="size-5" /> : <Lock className="size-4" />}
      </div>
      <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p
              className={cn(
                "text-xs font-bold uppercase",
                completed ? "text-[#5DDC45]" : "text-white/45",
              )}
            >
              Round {roundNumber}
            </p>
            <p className="mt-1 text-lg font-bold text-white">{title}</p>
          </div>
          {!completed ? (
            <p className="mt-6 text-sm text-white/70">{duration}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

function formatPrice(amountPaise: number) {
  return `₹${Math.round(amountPaise / 100)}`;
}
