import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createOrderForProduct, isPracticeFreeForUser } from "@/lib/payments";

const VALID_PRODUCT_SLUGS = ["new-jd-practice"] as const;

type CreateOrderBody = {
  productSlug?: string;
  jobId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as CreateOrderBody;

    if (
      !body.productSlug ||
      !VALID_PRODUCT_SLUGS.includes(body.productSlug as "new-jd-practice")
    ) {
      return NextResponse.json(
        { error: "Invalid or missing productSlug" },
        { status: 400 },
      );
    }

    // Check if practice is free for this user
    if (body.jobId) {
      const isFree = await isPracticeFreeForUser(session.user.id, body.jobId);
      if (isFree) {
        return NextResponse.json(
          { error: "Practice is free for this user" },
          { status: 400 },
        );
      }
    }

    const order = await createOrderForProduct(
      session.user.id,
      body.productSlug,
    );

    return NextResponse.json(order);
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 },
    );
  }
}
