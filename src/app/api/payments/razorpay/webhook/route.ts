import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { markDiagnosticPaid, recordCouponRedemptionForOrder } from "@/lib/payments";
import { generateReceiptPdf } from "@/lib/receipt-pdf";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";
import { uploadReceiptToS3 } from "@/lib/s3";
import { sendWhatsAppReceipt } from "@/lib/twilio";

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

    // Fetch order + user together so we have everything for the receipt
    const order = await prisma.order.findUnique({
      where: { razorpayOrderId: payment.order_id },
      include: {
        user: {
          select: { name: true, phoneNumber: true },
        },
      },
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
      await recordCouponRedemptionForOrder({
        couponCode: order.couponCode,
        diagnosticId,
        orderId: order.id,
        userId: order.userId,
      });
    }

    // ── Send WhatsApp receipt (non-blocking — failures don't affect response) ──
    void sendPaymentReceipt({ order, payment }).catch((err) => {
      console.error("Receipt delivery failed:", err);
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 },
    );
  }
}

// ─── Receipt Helper ──────────────────────────────────────────────────────────

type OrderWithUser = {
  id: string;
  razorpayOrderId: string;
  amount: number;
  originalAmount: number | null;
  discountAmount: number;
  couponCode: string | null;
  currency: string;
  jobId: string;
  notes: unknown;
  user: { name: string; phoneNumber: string | null };
};

type PaymentEntity = {
  id: string;
  amount?: number;
  currency?: string;
  method?: string;
  order_id?: string;
};

async function sendPaymentReceipt(params: {
  order: OrderWithUser;
  payment: PaymentEntity;
}) {
  const { order, payment } = params;
  const phoneNumber = order.user.phoneNumber;

  if (!phoneNumber) {
    console.warn(`No phone number for user on order ${order.id} — skipping receipt.`);
    return;
  }

  // Resolve job title from notes (saved during order creation)
  const jobTitle = getJobTitle(order.notes) ?? order.jobId;
  const paidAmount = payment.amount ?? order.amount;
  const currency = payment.currency ?? order.currency;
  const amountFormatted = `${currency === "INR" ? "₹" : currency}${Math.round(paidAmount / 100)}`;

  // Generate PDF
  const pdfBuffer = await generateReceiptPdf({
    orderId: order.id,
    razorpayOrderId: order.razorpayOrderId,
    razorpayPaymentId: payment.id,
    amount: paidAmount,
    currency,
    jobTitle,
    userName: order.user.name,
    userPhone: phoneNumber,
    paidAt: new Date(),
    couponCode: order.couponCode,
    originalAmount: order.originalAmount,
    discountAmount: order.discountAmount,
  });

  // Upload to S3 and get a signed URL
  const s3Key = `receipts/${order.id}.pdf`;
  const receiptUrl = await uploadReceiptToS3({ buffer: pdfBuffer, key: s3Key });

  // Persist the S3 key so we can regenerate signed URLs on demand
  await prisma.payment.update({
    where: { razorpayPaymentId: payment.id },
    data: { receiptKey: s3Key },
  });

  // Send via WhatsApp
  await sendWhatsAppReceipt({
    phoneNumber,
    userName: order.user.name,
    amountFormatted,
    jobTitle,
    orderId: order.id,
    receiptUrl,
  });
}

// ─── Type helpers ────────────────────────────────────────────────────────────

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

function getJobTitle(notes: unknown) {
  if (!notes || typeof notes !== "object" || Array.isArray(notes)) return null;
  const jobTitle = (notes as Record<string, unknown>).jobTitle;
  return typeof jobTitle === "string" ? jobTitle : null;
}
