import crypto from "node:crypto";
import Razorpay from "razorpay";

export const DIAGNOSTIC_UNLOCK_AMOUNT_PAISE = 29_900;
export const DIAGNOSTIC_UNLOCK_CURRENCY = "INR";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function getRazorpayClient() {
  return new Razorpay({
    key_id: requiredEnv("RAZORPAY_KEY_ID"),
    key_secret: requiredEnv("RAZORPAY_KEY_SECRET"),
  });
}

export function getRazorpayCheckoutKey() {
  return requiredEnv("NEXT_PUBLIC_RAZORPAY_KEY_ID");
}

export function verifyRazorpayPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const expected = crypto
    .createHmac("sha256", requiredEnv("RAZORPAY_KEY_SECRET"))
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(params.signature);

  return (
    expectedBuffer.length === signatureBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  );
}

export function verifyRazorpayWebhookSignature(params: {
  body: string;
  signature: string;
}) {
  const expected = crypto
    .createHmac("sha256", requiredEnv("RAZORPAY_WEBHOOK_SECRET"))
    .update(params.body)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(params.signature);

  return (
    expectedBuffer.length === signatureBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  );
}
