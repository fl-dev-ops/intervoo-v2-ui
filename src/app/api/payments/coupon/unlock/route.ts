import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { unlockDiagnosticWithCoupon } from "@/lib/payments";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      code?: unknown;
      diagnosticId?: unknown;
      jobId?: unknown;
    };
    const code = typeof body.code === "string" ? body.code : "";
    const diagnosticId =
      typeof body.diagnosticId === "string" ? body.diagnosticId : "";
    const jobId = typeof body.jobId === "string" ? body.jobId : "";

    if (!diagnosticId || !jobId) {
      return NextResponse.json(
        { error: "Missing diagnosticId or jobId" },
        { status: 400 },
      );
    }

    const result = await unlockDiagnosticWithCoupon({
      code,
      diagnosticId,
      jobId,
      userId: session.user.id,
    });

    if (!result.valid) {
      return NextResponse.json(result, { status: 400 });
    }

    // --- Deliver $0 Receipt ---
    const userId = session.user.id;
    try {
      const { prisma } = await import("@/lib/db");
      const { deliverWhatsAppReceipt } = await import("@/lib/receipt-delivery");
      
      const [user, diagnostic] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { name: true, phoneNumber: true } }),
        prisma.diagnostic.findUnique({ where: { id: diagnosticId }, select: { selectedJob: true } })
      ]);

      let jobTitle = jobId;
      if (diagnostic?.selectedJob && typeof diagnostic.selectedJob === "object") {
        const sj = diagnostic.selectedJob as Record<string, unknown>;
        if (typeof sj.jobTitle === "string") jobTitle = sj.jobTitle;
        else if (typeof sj.title === "string") jobTitle = sj.title;
      }

      if (user) {
        const pseudoOrderId = `coup_${diagnosticId.slice(-10)}_${Date.now().toString(36)}`;
        await deliverWhatsAppReceipt({
          amount: 0,
          currency: "INR",
          originalAmount: result.originalAmount ?? 29900,
          discountAmount: result.discountAmount ?? 29900,
          couponCode: result.code ?? code,
          orderId: pseudoOrderId,
          razorpayOrderId: "COUPON_100",
          razorpayPaymentId: "COUPON_100",
          jobTitle,
          userName: user.name ?? "Customer",
          userPhone: user.phoneNumber,
        });
      }
    } catch (err) {
      console.error("Failed to send 100% coupon receipt:", err);
    }

    return NextResponse.json({ ...result, unlocked: true });
  } catch (error) {
    console.error("Coupon unlock error:", error);
    return NextResponse.json(
      { error: "Failed to unlock diagnostic with coupon", valid: false },
      { status: 500 },
    );
  }
}
