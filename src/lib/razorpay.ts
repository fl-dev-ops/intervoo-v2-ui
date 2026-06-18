import "server-only";

import Razorpay from "razorpay";
import { serverEnv } from "@/lib/env";

export const razorpay = new Razorpay({
  key_id: serverEnv.RAZORPAY_KEY_ID,
  key_secret: serverEnv.RAZORPAY_KEY_SECRET,
});

export function getRazorpayKeyId(): string {
  return serverEnv.RAZORPAY_KEY_ID;
}
