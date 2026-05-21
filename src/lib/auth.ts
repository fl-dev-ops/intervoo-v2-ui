import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { phoneNumber } from "better-auth/plugins/phone-number";
import { prisma } from "@/lib/db";
import { sendWhatsAppOTP } from "./twilio";

function getTempEmail(phoneNumber: string) {
  const normalizedPhone = phoneNumber.replace(/[^\d+]/g, "");
  const encodedPhone = normalizedPhone.replace("+", "plus-");

  return `${encodedPhone}@otp.foreverlearning.in`;
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    phoneNumber({
      otpLength: 4,
      expiresIn: 300,
      signUpOnVerification: {
        getTempEmail,
        getTempName: (phoneNumber) => phoneNumber,
      },
      sendOTP: async ({ phoneNumber: phone, code }) => {
        await sendWhatsAppOTP(phone, code);
      },
      phoneNumberValidator: (phone) => /^\+[1-9]\d{1,14}$/.test(phone),
    }),
  ],
});
