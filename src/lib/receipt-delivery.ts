import { prisma } from "@/lib/db";
import { generateReceiptPdf } from "@/lib/receipt-pdf";
import { uploadReceiptToS3 } from "@/lib/s3";
import { sendWhatsAppReceipt } from "@/lib/twilio";

export type DeliverReceiptParams = {
  amount: number;
  currency: string;
  originalAmount: number | null;
  discountAmount: number;
  couponCode: string | null;
  
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  
  jobTitle: string;
  
  userName: string;
  userPhone: string | null;
};

export async function deliverWhatsAppReceipt(params: DeliverReceiptParams) {
  if (!params.userPhone) {
    console.warn(`No phone number for user on order ${params.orderId} — skipping receipt.`);
    return;
  }

  const amountFormatted = `${params.currency === "INR" ? "₹" : params.currency}${Math.round(params.amount / 100)}`;

  // Generate PDF
  const pdfBuffer = await generateReceiptPdf({
    orderId: params.orderId,
    razorpayOrderId: params.razorpayOrderId,
    razorpayPaymentId: params.razorpayPaymentId,
    amount: params.amount,
    currency: params.currency,
    jobTitle: params.jobTitle,
    userName: params.userName,
    userPhone: params.userPhone,
    paidAt: new Date(),
    couponCode: params.couponCode,
    originalAmount: params.originalAmount,
    discountAmount: params.discountAmount,
  });

  // Upload to S3 and get a signed URL
  const s3Key = `receipts/${params.orderId}.pdf`;
  const receiptUrl = await uploadReceiptToS3({ buffer: pdfBuffer, key: s3Key });

  // Persist the S3 key if this is an actual Razorpay payment
  if (params.razorpayPaymentId && params.razorpayPaymentId !== "COUPON_100") {
    await prisma.payment.update({
      where: { razorpayPaymentId: params.razorpayPaymentId },
      data: { receiptKey: s3Key },
    }).catch(err => console.error("Failed to update payment with receiptKey:", err));
  }

  // Send via WhatsApp
  await sendWhatsAppReceipt({
    phoneNumber: params.userPhone,
    userName: params.userName,
    amountFormatted,
    jobTitle: params.jobTitle,
    orderId: params.orderId,
    receiptUrl,
  });
}
