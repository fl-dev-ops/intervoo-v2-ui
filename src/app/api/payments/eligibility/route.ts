import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDiagnosticPaymentEligibility } from "@/lib/payments";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobId = request.nextUrl.searchParams.get("jobId") ?? "";
    const diagnosticId = request.nextUrl.searchParams.get("diagnosticId");

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    const eligibility = await getDiagnosticPaymentEligibility({
      diagnosticId,
      jobId,
      userId: session.user.id,
    });

    return NextResponse.json(eligibility);
  } catch (error) {
    console.error("Payment eligibility error:", error);
    return NextResponse.json(
      { error: "Failed to check payment eligibility" },
      { status: 500 },
    );
  }
}
