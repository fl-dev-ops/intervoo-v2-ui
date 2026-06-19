import "server-only";

import Razorpay from "razorpay";

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  throw new Error(
    "Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET environment variables",
  );
}

export const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

export function getRazorpayKeyId(): string {
  if (!keyId) {
    throw new Error("Missing RAZORPAY_KEY_ID environment variable");
  }
  return keyId;
}
