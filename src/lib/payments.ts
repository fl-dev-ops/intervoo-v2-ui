import { prisma } from "@/lib/db";
import { getLatestDiagnosticForJob } from "@/lib/diagnostics/jd-progress";

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
