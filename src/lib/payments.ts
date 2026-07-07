import { prisma } from "@/lib/db";
import { getLatestDiagnosticForJob } from "@/lib/diagnostics/jd-progress";
import { getSelectedJobId } from "@/lib/diagnostics/selected-job";
import { DIAGNOSTIC_UNLOCK_AMOUNT_PAISE } from "@/lib/razorpay";

export type PaymentEligibilityReason =
  | "DIAGNOSTIC_ALREADY_PAID"
  | "FIRST_FREE_ROUND"
  | "PAYMENT_REQUIRED";

export type DiagnosticPaymentEligibility = {
  canStartRound: boolean;
  diagnosticId: string | null;
  isPaid: boolean;
  reason: PaymentEligibilityReason;
  requiresPayment: boolean;
};

export type CouponValidationResult =
  | {
      code: string;
      couponId: string;
      discountAmount: number;
      finalAmount: number;
      originalAmount: number;
      valid: true;
    }
  | {
      error: string;
      valid: false;
    };

export function normalizeCouponCode(code: string) {
  return code.trim().toUpperCase();
}

export async function hasUserTakenAnyRound(userId: string) {
  const round = await prisma.diagnosticRound.findFirst({
    where: { diagnostic: { userId } },
    select: { id: true },
  });

  return Boolean(round);
}

export async function getDiagnosticPaymentEligibility(params: {
  diagnosticId?: string | null;
  jobId: string;
  userId: string;
}): Promise<DiagnosticPaymentEligibility> {
  const diagnostic = params.diagnosticId
    ? await prisma.diagnostic.findFirst({
        where: { id: params.diagnosticId, userId: params.userId },
        select: { id: true, paidAt: true },
      })
    : await getLatestDiagnosticForJob(params.userId, params.jobId);

  if (diagnostic?.paidAt) {
    return {
      canStartRound: true,
      diagnosticId: diagnostic.id,
      isPaid: true,
      reason: "DIAGNOSTIC_ALREADY_PAID",
      requiresPayment: false,
    };
  }

  const hasTakenAnyRound = await hasUserTakenAnyRound(params.userId);

  if (!hasTakenAnyRound) {
    return {
      canStartRound: true,
      diagnosticId: diagnostic?.id ?? null,
      isPaid: false,
      reason: "FIRST_FREE_ROUND",
      requiresPayment: false,
    };
  }

  return {
    canStartRound: false,
    diagnosticId: diagnostic?.id ?? null,
    isPaid: false,
    reason: "PAYMENT_REQUIRED",
    requiresPayment: true,
  };
}

export async function markDiagnosticPaid(params: {
  diagnosticId: string;
  orderId: string;
}) {
  await prisma.$transaction([
    prisma.order.update({
      where: { id: params.orderId },
      data: { status: "PAID" },
    }),
    prisma.diagnostic.update({
      where: { id: params.diagnosticId },
      data: {
        orderId: params.orderId,
        paidAt: new Date(),
      },
    }),
  ]);
}

export async function validateCouponForDiagnostic(params: {
  code: string;
  diagnosticId: string;
  jobId: string;
  userId: string;
}): Promise<CouponValidationResult> {
  const code = normalizeCouponCode(params.code);

  if (!code) {
    return { error: "Enter a coupon code", valid: false };
  }

  const diagnostic = await prisma.diagnostic.findFirst({
    where: { id: params.diagnosticId, userId: params.userId },
    select: { id: true, paidAt: true, selectedJob: true },
  });

  if (!diagnostic || getSelectedJobId(diagnostic.selectedJob) !== params.jobId) {
    return { error: "Diagnostic not found", valid: false };
  }

  if (diagnostic.paidAt) {
    return { error: "This diagnostic is already unlocked", valid: false };
  }

  const coupon = await prisma.coupon.findUnique({
    where: { code },
    include: {
      redemptions: {
        where: { userId: params.userId },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!coupon || !coupon.isActive) {
    return { error: "Invalid coupon code", valid: false };
  }

  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    return { error: "This coupon has expired", valid: false };
  }

  if (coupon.redemptions.length > 0) {
    return { error: "You have already used this coupon", valid: false };
  }

  const discountAmount = calculateCouponDiscount({
    amount: DIAGNOSTIC_UNLOCK_AMOUNT_PAISE,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
  });

  return {
    code: coupon.code,
    couponId: coupon.id,
    discountAmount,
    finalAmount: Math.max(DIAGNOSTIC_UNLOCK_AMOUNT_PAISE - discountAmount, 0),
    originalAmount: DIAGNOSTIC_UNLOCK_AMOUNT_PAISE,
    valid: true,
  };
}

export async function unlockDiagnosticWithCoupon(params: {
  code: string;
  diagnosticId: string;
  jobId: string;
  userId: string;
}) {
  const validation = await validateCouponForDiagnostic(params);

  if (!validation.valid) {
    return validation;
  }

  if (validation.finalAmount > 0) {
    return {
      error: "Coupon does not fully unlock this diagnostic",
      valid: false as const,
    };
  }

  await prisma.$transaction([
    prisma.couponRedemption.create({
      data: {
        couponId: validation.couponId,
        diagnosticId: params.diagnosticId,
        userId: params.userId,
      },
    }),
    prisma.diagnostic.update({
      where: { id: params.diagnosticId },
      data: { paidAt: new Date() },
    }),
  ]);

  return validation;
}

export async function recordCouponRedemptionForOrder(params: {
  couponCode: string | null;
  diagnosticId: string;
  orderId: string;
  userId: string;
}) {
  if (!params.couponCode) return;

  const coupon = await prisma.coupon.findUnique({
    where: { code: normalizeCouponCode(params.couponCode) },
    select: { id: true },
  });

  if (!coupon) return;

  await prisma.couponRedemption.upsert({
    where: { couponId_userId: { couponId: coupon.id, userId: params.userId } },
    create: {
      couponId: coupon.id,
      diagnosticId: params.diagnosticId,
      orderId: params.orderId,
      userId: params.userId,
    },
    update: {
      diagnosticId: params.diagnosticId,
      orderId: params.orderId,
      redeemedAt: new Date(),
    },
  });
}

function calculateCouponDiscount(params: {
  amount: number;
  discountType: "FLAT" | "PERCENTAGE";
  discountValue: number;
}) {
  if (params.discountType === "FLAT") {
    return clampDiscount(params.discountValue, params.amount);
  }

  const percentage = Math.max(Math.min(params.discountValue, 100), 0);
  return clampDiscount(Math.floor((params.amount * percentage) / 100), params.amount);
}

function clampDiscount(discount: number, amount: number) {
  return Math.max(Math.min(discount, amount), 0);
}
