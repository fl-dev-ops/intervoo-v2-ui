import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateCouponForDiagnostic } from "@/lib/payments";

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

    const result = await validateCouponForDiagnostic({
      code,
      diagnosticId,
      jobId,
      userId: session.user.id,
    });

    if (!result.valid) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Coupon validation error:", error);
    return NextResponse.json(
      { error: "Failed to validate coupon", valid: false },
      { status: 500 },
    );
  }
}
