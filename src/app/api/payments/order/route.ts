import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSelectedJobId } from "@/lib/diagnostics/selected-job";
import { getDiagnosticPaymentEligibility } from "@/lib/payments";
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
      diagnosticId?: unknown;
      jobId?: unknown;
    };
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

    const razorpay = getRazorpayClient();
    const receipt = `diag_${diagnosticId.slice(-10)}_${Date.now().toString(36)}`;
    const razorpayOrder = await razorpay.orders.create({
      amount: DIAGNOSTIC_UNLOCK_AMOUNT_PAISE,
      currency: DIAGNOSTIC_UNLOCK_CURRENCY,
      notes: { diagnosticId, jobId, userId: session.user.id },
      receipt,
    });

    const order = await prisma.order.create({
      data: {
        amount: DIAGNOSTIC_UNLOCK_AMOUNT_PAISE,
        currency: DIAGNOSTIC_UNLOCK_CURRENCY,
        jobId,
        notes: { diagnosticId, jobId },
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
