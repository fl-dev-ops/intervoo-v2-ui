import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { phoneNumber } from "better-auth/plugins/phone-number";
import { prisma } from "#/db.server";
import { sendWhatsAppOTP } from "./twilio.server";

function getTempEmail(phoneNumber: string) {
  const normalizedPhone = phoneNumber.replace(/[^\d+]/g, "");
  const encodedPhone = normalizedPhone.replace("+", "plus-");

  return `${encodedPhone}@otp.foreverlearning.local`;
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  plugins: [
    phoneNumber({
      otpLength: 6,
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
    tanstackStartCookies(),
  ],
});
