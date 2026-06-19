import { createHmac } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { fulfillOrder, getOrderByRazorpayId } from "@/lib/payments";

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing webhook signature" },
        { status: 400 },
      );
    }

    if (!WEBHOOK_SECRET) {
      console.warn(
        "RAZORPAY_WEBHOOK_SECRET not configured, skipping webhook verification",
      );
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 },
      );
    }

    // Verify webhook signature
    const expectedSignature = createHmac("sha256", WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 },
      );
    }

    const event = JSON.parse(body);

    // Handle payment.captured event
    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;

      // Get the order from our DB
      const order = await getOrderByRazorpayId(orderId);

      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      // Fulfill the order if not already fulfilled
      if (order.status !== "PAID") {
        await fulfillOrder({
          orderId: order.id,
          razorpayPaymentId: payment.id,
          razorpaySignature: signature,
        });
      }
    }

    // Return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
