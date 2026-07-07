import { PDFDocument, PageSizes, StandardFonts, rgb } from "pdf-lib";

export type ReceiptData = {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amount: number; // in paise
  currency: string;
  jobTitle: string;
  userName: string;
  userPhone: string;
  paidAt: Date;
  couponCode?: string | null;
  originalAmount?: number | null; // in paise
  discountAmount?: number | null; // in paise
};

function formatAmount(paise: number, currency = "INR") {
  return `${currency === "INR" ? "INR" : currency} ${(paise / 100).toFixed(2)}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function formatDateTime(date: Date) {
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
    hour12: true,
  }) + " IST";
}

/**
 * Generates a branded payment receipt PDF and returns it as a Buffer.
 */
export async function generateReceiptPdf(data: ReceiptData): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage(PageSizes.A4);
  const { width, height } = page.getSize();

  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // ── Colors ──────────────────────────────────────────────────────────────
  const purple = rgb(0.36, 0.25, 0.88);   // #5C40E0
  const darkPurple = rgb(0.08, 0.03, 0.23); // #140960
  const gray = rgb(0.5, 0.47, 0.52);
  const lightGray = rgb(0.95, 0.94, 0.96);
  const black = rgb(0.14, 0.12, 0.15);
  const white = rgb(1, 1, 1);
  const green = rgb(0.27, 0.73, 0.37);

  const margin = 48;
  const contentWidth = width - margin * 2;

  // ── Header Banner ────────────────────────────────────────────────────────
  page.drawRectangle({
    x: 0,
    y: height - 110,
    width,
    height: 110,
    color: darkPurple,
  });

  // Brand name
  page.drawText("Intervoo", {
    x: margin,
    y: height - 44,
    size: 24,
    font: fontBold,
    color: white,
  });

  page.drawText("Diagnostics", {
    x: margin,
    y: height - 64,
    size: 13,
    font: fontRegular,
    color: rgb(0.7, 0.65, 0.9),
  });

  // "PAYMENT RECEIPT" label on the right
  page.drawText("PAYMENT RECEIPT", {
    x: width - margin - 140,
    y: height - 52,
    size: 13,
    font: fontBold,
    color: rgb(0.7, 0.65, 0.9),
  });

  page.drawText(formatDate(data.paidAt), {
    x: width - margin - 140,
    y: height - 70,
    size: 10,
    font: fontRegular,
    color: rgb(0.6, 0.57, 0.8),
  });

  // ── Receipt Number ───────────────────────────────────────────────────────
  let y = height - 145;

  page.drawText("Receipt #", {
    x: margin,
    y,
    size: 10,
    font: fontRegular,
    color: gray,
  });
  page.drawText(data.orderId.slice(0, 16).toUpperCase(), {
    x: margin + 62,
    y,
    size: 10,
    font: fontBold,
    color: black,
  });

  // ── Paid To ──────────────────────────────────────────────────────────────
  y -= 36;
  page.drawText("BILLED TO", {
    x: margin,
    y,
    size: 9,
    font: fontBold,
    color: gray,
  });

  y -= 18;
  page.drawText(data.userName || "Customer", {
    x: margin,
    y,
    size: 13,
    font: fontBold,
    color: black,
  });

  y -= 18;
  page.drawText(data.userPhone, {
    x: margin,
    y,
    size: 11,
    font: fontRegular,
    color: gray,
  });

  // ── Divider ──────────────────────────────────────────────────────────────
  y -= 28;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: lightGray,
  });

  // ── Line Items Table ─────────────────────────────────────────────────────
  y -= 32;

  // Table header
  page.drawRectangle({
    x: margin,
    y: y - 6,
    width: contentWidth,
    height: 28,
    color: lightGray,
  });

  page.drawText("DESCRIPTION", {
    x: margin + 12,
    y: y + 4,
    size: 9,
    font: fontBold,
    color: gray,
  });
  page.drawText("AMOUNT", {
    x: width - margin - 70,
    y: y + 4,
    size: 9,
    font: fontBold,
    color: gray,
  });

  y -= 32;

  // Row: Diagnostic Unlock
  page.drawText(`Diagnostic Unlock — ${data.jobTitle || "Job Role"}`, {
    x: margin + 12,
    y,
    size: 11,
    font: fontBold,
    color: black,
  });

  const baseAmount = data.originalAmount ?? data.amount;
  page.drawText(formatAmount(baseAmount, data.currency), {
    x: width - margin - 70,
    y,
    size: 11,
    font: fontBold,
    color: black,
  });

  // Row: Coupon discount (if any)
  if (data.couponCode && data.discountAmount && data.discountAmount > 0) {
    y -= 26;
    page.drawText(`Coupon: ${data.couponCode}`, {
      x: margin + 12,
      y,
      size: 10,
      font: fontRegular,
      color: green,
    });
    page.drawText(`- ${formatAmount(data.discountAmount, data.currency)}`, {
      x: width - margin - 70,
      y,
      size: 10,
      font: fontBold,
      color: green,
    });
  }

  // ── Divider ──────────────────────────────────────────────────────────────
  y -= 24;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: lightGray,
  });

  // ── Total ────────────────────────────────────────────────────────────────
  y -= 28;
  page.drawText("Total Paid", {
    x: margin + 12,
    y,
    size: 13,
    font: fontBold,
    color: black,
  });

  // Total amount pill
  const totalText = formatAmount(data.amount, data.currency);
  const pillWidth = totalText.length * 9 + 24;
  page.drawRectangle({
    x: width - margin - pillWidth,
    y: y - 6,
    width: pillWidth,
    height: 28,
    color: purple,
  });
  page.drawText(totalText, {
    x: width - margin - pillWidth + 12,
    y: y + 4,
    size: 13,
    font: fontBold,
    color: white,
  });

  // ── Payment Details ───────────────────────────────────────────────────────
  y -= 52;

  page.drawText("PAYMENT DETAILS", {
    x: margin,
    y,
    size: 9,
    font: fontBold,
    color: gray,
  });

  const details: [string, string][] = [
    ["Payment Date", formatDateTime(data.paidAt)],
    ["Razorpay Order ID", data.razorpayOrderId],
    ["Razorpay Payment ID", data.razorpayPaymentId],
    ["Payment Method", "Razorpay"],
    ["Status", "PAID"],
  ];

  for (const [label, value] of details) {
    y -= 22;
    page.drawText(label, {
      x: margin,
      y,
      size: 10,
      font: fontRegular,
      color: gray,
    });
    page.drawText(value, {
      x: margin + 160,
      y,
      size: 10,
      font: label === "Status" ? fontBold : fontRegular,
      color: label === "Status" ? green : black,
    });
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height: 60,
    color: lightGray,
  });

  page.drawText("Thank you for choosing Intervoo Diagnostics!", {
    x: margin,
    y: 36,
    size: 11,
    font: fontBold,
    color: purple,
  });

  page.drawText("For support, contact us at support@intervoo.ai", {
    x: margin,
    y: 18,
    size: 9,
    font: fontRegular,
    color: gray,
  });

  page.drawText("intervoo.ai", {
    x: width - margin - 60,
    y: 26,
    size: 9,
    font: fontRegular,
    color: gray,
  });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
