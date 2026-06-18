import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  fulfillOrder,
  getOrderByRazorpayId,
  verifyPaymentSignature,
} from "@/lib/payments";

type VerifyPaymentBody = {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  jobId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as VerifyPaymentBody;

    if (
      !body.razorpay_payment_id ||
      !body.razorpay_order_id ||
      !body.razorpay_signature
    ) {
      return NextResponse.json(
        { error: "Missing payment details" },
        { status: 400 },
      );
    }

    // Verify signature
    const isValid = verifyPaymentSignature({
      razorpayOrderId: body.razorpay_order_id,
      razorpayPaymentId: body.razorpay_payment_id,
      razorpaySignature: body.razorpay_signature,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 },
      );
    }

    // Get the order
    const order = await getOrderByRazorpayId(body.razorpay_order_id);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fulfill the order
    const result = await fulfillOrder({
      orderId: order.id,
      razorpayPaymentId: body.razorpay_payment_id,
      razorpaySignature: body.razorpay_signature,
      jobId: body.jobId,
    });

    return NextResponse.json({
      success: result.success,
      diagnosticId: result.diagnosticId,
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 },
    );
  }
}
