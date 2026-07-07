import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSelectedJobId } from "@/lib/diagnostics/selected-job";
import {
  getDiagnosticPaymentEligibility,
  normalizeCouponCode,
  validateCouponForDiagnostic,
} from "@/lib/payments";
import {
  DIAGNOSTIC_UNLOCK_AMOUNT_PAISE,
  DIAGNOSTIC_UNLOCK_CURRENCY,
  getRazorpayCheckoutKey,
  getRazorpayClient,
} from "@/lib/razorpay";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      couponCode?: unknown;
      diagnosticId?: unknown;
      jobId?: unknown;
    };
    const couponCode =
      typeof body.couponCode === "string"
        ? normalizeCouponCode(body.couponCode)
        : null;
    const diagnosticId =
      typeof body.diagnosticId === "string" ? body.diagnosticId : "";
    const jobId = typeof body.jobId === "string" ? body.jobId : "";

    if (!diagnosticId || !jobId) {
      return NextResponse.json(
        { error: "Missing diagnosticId or jobId" },
        { status: 400 },
      );
    }

    const diagnostic = await prisma.diagnostic.findFirst({
      where: { id: diagnosticId, userId: session.user.id },
      select: { id: true, paidAt: true, selectedJob: true },
    });

    if (!diagnostic || getSelectedJobId(diagnostic.selectedJob) !== jobId) {
      return NextResponse.json(
        { error: "Diagnostic not found" },
        { status: 404 },
      );
    }

    const eligibility = await getDiagnosticPaymentEligibility({
      diagnosticId,
      jobId,
      userId: session.user.id,
    });

    if (!eligibility.requiresPayment) {
      return NextResponse.json(
        { error: "Payment is not required for this diagnostic" },
        { status: 400 },
      );
    }

    const coupon = couponCode
      ? await validateCouponForDiagnostic({
          code: couponCode,
          diagnosticId,
          jobId,
          userId: session.user.id,
        })
      : null;

    if (coupon && !coupon.valid) {
      return NextResponse.json(coupon, { status: 400 });
    }

    const amount = coupon?.valid
      ? coupon.finalAmount
      : DIAGNOSTIC_UNLOCK_AMOUNT_PAISE;

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Use coupon unlock for fully discounted coupons" },
        { status: 400 },
      );
    }

    const razorpay = getRazorpayClient();
    const receipt = `diag_${diagnosticId.slice(-10)}_${Date.now().toString(36)}`;
    const razorpayOrder = await razorpay.orders.create({
      amount,
      currency: DIAGNOSTIC_UNLOCK_CURRENCY,
      notes: { couponCode, diagnosticId, jobId, userId: session.user.id },
      receipt,
    });

    const order = await prisma.order.create({
      data: {
        amount,
        couponCode,
        currency: DIAGNOSTIC_UNLOCK_CURRENCY,
        discountAmount: coupon?.valid ? coupon.discountAmount : 0,
        jobId,
        notes: { couponCode, diagnosticId, jobId },
        originalAmount: DIAGNOSTIC_UNLOCK_AMOUNT_PAISE,
        razorpayOrderId: razorpayOrder.id,
        receipt,
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      amount: order.amount,
      currency: order.currency,
      key: getRazorpayCheckoutKey(),
      localOrderId: order.id,
      razorpayOrderId: order.razorpayOrderId,
    });
  } catch (error) {
    console.error("Payment order error:", error);
    return NextResponse.json(
      { error: "Failed to create payment order" },
      { status: 500 },
    );
  }
}
