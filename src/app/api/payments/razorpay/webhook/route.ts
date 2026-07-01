import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { markDiagnosticPaid } from "@/lib/payments";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature") ?? "";

    if (!signature || !verifyRazorpayWebhookSignature({ body, signature })) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 },
      );
    }

    const event = JSON.parse(body) as RazorpayWebhookPayload;
    const payment = event.payload?.payment?.entity;
    const eventId = `${event.event}:${payment?.id ?? event.created_at ?? Date.now()}`;

    try {
      await prisma.webhookEvent.create({
        data: {
          eventId,
          payload: event as unknown as object,
          provider: "razorpay",
        },
      });
    } catch {
      return NextResponse.json({ received: true, duplicate: true });
    }

    if (event.event !== "payment.captured" || !payment?.order_id) {
      return NextResponse.json({ received: true });
    }

    const order = await prisma.order.findUnique({
      where: { razorpayOrderId: payment.order_id },
    });

    if (!order) {
      return NextResponse.json({ received: true, missingOrder: true });
    }

    await prisma.payment.upsert({
      where: { razorpayPaymentId: payment.id },
      create: {
        amount: payment.amount ?? order.amount,
        capturedAt: new Date(),
        currency: payment.currency ?? order.currency,
        method: payment.method ?? null,
        metadata: payment as unknown as object,
        orderId: order.id,
        razorpayPaymentId: payment.id,
        status: "CAPTURED",
      },
      update: {
        capturedAt: new Date(),
        metadata: payment as unknown as object,
        method: payment.method ?? null,
        status: "CAPTURED",
      },
    });

    const diagnosticId = getDiagnosticId(order.notes);
    if (diagnosticId) {
      await markDiagnosticPaid({ diagnosticId, orderId: order.id });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 },
    );
  }
}

type RazorpayWebhookPayload = {
  created_at?: number;
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        amount?: number;
        currency?: string;
        id: string;
        method?: string;
        order_id?: string;
      };
    };
  };
};

function getDiagnosticId(notes: unknown) {
  if (!notes || typeof notes !== "object" || Array.isArray(notes)) return null;
  const diagnosticId = (notes as Record<string, unknown>).diagnosticId;
  return typeof diagnosticId === "string" ? diagnosticId : null;
}
