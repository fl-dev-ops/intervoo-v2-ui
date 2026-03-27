const WHATSAPP_TEMPLATE_SID = "HX0783a0218918d1452853b2ef419fe87d";

export async function sendWhatsAppOTP(phoneNumber: string, code: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_WHATSAPP_FROM!;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const body = new URLSearchParams({
    From: from,
    To: `whatsapp:${phoneNumber}`,
    ContentSid: WHATSAPP_TEMPLATE_SID,
    ContentVariables: JSON.stringify({ "1": code }),
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio WhatsApp error: ${error}`);
  }
}
