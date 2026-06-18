import "server-only";

import { createHmac } from "node:crypto";
import { prisma } from "@/lib/db";
import { areAllDiagnosticRoundsComplete } from "@/lib/diagnostics/rules";
import { serverEnv } from "@/lib/env";
import { getRazorpayKeyId, razorpay } from "@/lib/razorpay";

/**
 * Check if a user has completed their first free diagnostic (all 4 rounds READY).
 */
export async function hasUserCompletedFreeDiagnostic(
  userId: string,
): Promise<boolean> {
  const diagnostics = await prisma.diagnostic.findMany({
    where: { userId },
    include: {
      rounds: {
        include: { session: { include: { report: true } } },
      },
    },
  });

  return diagnostics.some((d) => areAllDiagnosticRoundsComplete(d.rounds));
}

/**
 * Check if a JD practice is free for the user.
 * Free if: user has no completed diagnostic yet, OR already has a diagnostic for this jobId.
 */
export async function isPracticeFreeForUser(
  userId: string,
  jobId: string,
): Promise<boolean> {
  // Check if user already has a diagnostic for this jobId (free or paid)
  const existingDiagnostic = await prisma.diagnostic.findFirst({
    where: {
      userId,
      selectedJob: { path: ["jobId"], equals: jobId },
    },
  });

  if (existingDiagnostic) {
    return true; // Already has a diagnostic for this JD
  }

  // Check if user has completed any diagnostic
  const hasCompleted = await hasUserCompletedFreeDiagnostic(userId);

  return !hasCompleted; // Free if no completed diagnostic
}

/**
 * Get the product by slug.
 */
export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug, isActive: true },
  });
}

/**
 * Create an order for a product.
 * Creates both a local Order record and a Razorpay order.
 */
export async function createOrderForProduct(
  userId: string,
  productSlug: string,
) {
  const product = await getProductBySlug(productSlug);

  if (!product) {
    throw new Error(`Product not found: ${productSlug}`);
  }

  const receipt = `rcpt_${userId.slice(0, 8)}_${Date.now()}`.slice(0, 40);

  // Create Razorpay order
  const razorpayOrder = await razorpay.orders.create({
    amount: product.amount,
    currency: product.currency,
    receipt,
    notes: {
      userId,
      productId: product.id,
      productSlug: product.slug,
    },
  });

  // Create local Order record
  const order = await prisma.order.create({
    data: {
      razorpayOrderId: razorpayOrder.id,
      userId,
      productId: product.id,
      amount: product.amount,
      currency: product.currency,
      receipt,
      status: "CREATED",
    },
  });

  return {
    orderId: order.id,
    razorpayOrderId: razorpayOrder.id,
    amount: product.amount,
    currency: product.currency,
    keyId: getRazorpayKeyId(),
  };
}

/**
 * Verify Razorpay payment signature.
 * Uses HMAC SHA256 of `order_id + "|" + payment_id` with key_secret.
 */
export function verifyPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): boolean {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;
  const keySecret = serverEnv.RAZORPAY_KEY_SECRET;

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");

  return expectedSignature === razorpaySignature;
}

/**
 * Fulfill an order after payment verification.
 * Marks order as PAID, creates Payment record, and links to Diagnostic.
 */
export async function fulfillOrder(params: {
  orderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  jobId?: string;
}) {
  const { orderId, razorpayPaymentId, razorpaySignature, jobId } = params;

  // Get the order
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: true },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.status === "PAID") {
    return { success: true, diagnosticId: null, alreadyPaid: true };
  }

  // Create Payment record
  await prisma.payment.create({
    data: {
      orderId: order.id,
      razorpayPaymentId,
      razorpaySignature,
      status: "CAPTURED",
      amount: order.amount,
      currency: order.currency,
      capturedAt: new Date(),
    },
  });

  // Update Order status
  await prisma.order.update({
    where: { id: order.id },
    data: { status: "PAID" },
  });

  // If jobId provided, create or update Diagnostic with payment
  let diagnosticId: string | null = null;

  if (jobId) {
    const existingDiagnostic = await prisma.diagnostic.findFirst({
      where: {
        userId: order.userId,
        selectedJob: { path: ["jobId"], equals: jobId },
      },
    });

    if (existingDiagnostic) {
      // Link existing diagnostic to this order
      const updated = await prisma.diagnostic.update({
        where: { id: existingDiagnostic.id },
        data: {
          orderId: order.id,
          paidAt: new Date(),
        },
      });
      diagnosticId = updated.id;
    } else {
      // Create new diagnostic with payment
      const newDiagnostic = await prisma.diagnostic.create({
        data: {
          userId: order.userId,
          orderId: order.id,
          paidAt: new Date(),
        },
      });
      diagnosticId = newDiagnostic.id;
    }
  }

  return { success: true, diagnosticId, alreadyPaid: false };
}

/**
 * Get order by Razorpay order ID.
 */
export async function getOrderByRazorpayId(razorpayOrderId: string) {
  return prisma.order.findUnique({
    where: { razorpayOrderId },
    include: { product: true },
  });
}
