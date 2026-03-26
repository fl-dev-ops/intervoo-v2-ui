import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { phoneNumber } from "better-auth/plugins/phone-number";
import { prisma } from "#/db";
import { sendWhatsAppOTP } from "./twilio";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    phoneNumber({
      otpLength: 6,
      expiresIn: 300,
      sendOTP: async ({ phoneNumber: phone, code }) => {
        await sendWhatsAppOTP(phone, code);
      },
      phoneNumberValidator: (phone) => /^\+[1-9]\d{1,14}$/.test(phone),
    }),
    tanstackStartCookies(),
  ],
});
