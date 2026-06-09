const WHATSAPP_TEMPLATE_SID = "HX0783a0218918d1452853b2ef419fe87d";
const OG_REPORT_WHATSAPP_TEMPLATE_SID = "HXf59ff837b03642498022a9fefe15e089";
const DIAGNOSTIC_REPORT_WHATSAPP_TEMPLATE_SID =
  process.env.DIAGNOSTIC_REPORT_WHATSAPP_TEMPLATE_SID ??
  OG_REPORT_WHATSAPP_TEMPLATE_SID;

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export async function sendWhatsAppOTP(
  phoneNumber: string,
  code: string,
): Promise<void> {
  const accountSid = requiredEnv("TWILIO_ACCOUNT_SID");
  const authToken = requiredEnv("TWILIO_AUTH_TOKEN");
  const from = requiredEnv("TWILIO_WHATSAPP_FROM");

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString(
    "base64",
  );

  const body = new URLSearchParams({
    From: from,
    To: `whatsapp:${phoneNumber}`,
    ContentSid: WHATSAPP_TEMPLATE_SID,
    ContentVariables: JSON.stringify({ "1": code }),
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio WhatsApp error: ${error}`);
  }
}

export async function sendWhatsAppReportLink(
  phoneNumber: string,
  userName: string,
  reportUrl: string,
): Promise<void> {
  const accountSid = requiredEnv("TWILIO_ACCOUNT_SID");
  const authToken = requiredEnv("TWILIO_AUTH_TOKEN");
  const from = requiredEnv("TWILIO_WHATSAPP_FROM");

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString(
    "base64",
  );

  const body = new URLSearchParams({
    From: from,
    To: `whatsapp:${phoneNumber}`,
    ContentSid: DIAGNOSTIC_REPORT_WHATSAPP_TEMPLATE_SID,
    ContentVariables: JSON.stringify({ "1": userName, "2": reportUrl }),
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Twilio WhatsApp report link error:", error);
  }
}
