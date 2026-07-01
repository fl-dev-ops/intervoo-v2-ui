import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { markDiagnosticPaid } from "@/lib/payments";
import { verifyRazorpayPaymentSignature } from "@/lib/razorpay";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      razorpay_order_id?: unknown;
      razorpay_payment_id?: unknown;
      razorpay_signature?: unknown;
    };

    const razorpayOrderId =
      typeof body.razorpay_order_id === "string" ? body.razorpay_order_id : "";
    const razorpayPaymentId =
      typeof body.razorpay_payment_id === "string"
        ? body.razorpay_payment_id
        : "";
    const razorpaySignature =
      typeof body.razorpay_signature === "string"
        ? body.razorpay_signature
        : "";

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { error: "Missing Razorpay payment details" },
        { status: 400 },
      );
    }

    const isValid = verifyRazorpayPaymentSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 },
      );
    }

    const order = await prisma.order.findFirst({
      where: { razorpayOrderId, userId: session.user.id },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const diagnosticId = getDiagnosticId(order.notes);
    if (!diagnosticId) {
      return NextResponse.json(
        { error: "Order is missing diagnostic metadata" },
        { status: 400 },
      );
    }

    await prisma.payment.upsert({
      where: { razorpayPaymentId },
      create: {
        amount: order.amount,
        currency: order.currency,
        orderId: order.id,
        razorpayPaymentId,
        razorpaySignature,
        status: "CAPTURED",
        capturedAt: new Date(),
      },
      update: {
        razorpaySignature,
        status: "CAPTURED",
        capturedAt: new Date(),
      },
    });

    await markDiagnosticPaid({ diagnosticId, orderId: order.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Payment verify error:", error);
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 },
    );
  }
}

function getDiagnosticId(notes: unknown) {
  if (!notes || typeof notes !== "object" || Array.isArray(notes)) return null;
  const diagnosticId = (notes as Record<string, unknown>).diagnosticId;
  return typeof diagnosticId === "string" ? diagnosticId : null;
}
