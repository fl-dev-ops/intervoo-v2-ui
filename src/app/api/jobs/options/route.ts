import { NextResponse } from "next/server";
import { getOptions } from "@/lib/jd-client";

export async function GET() {
  try {
    const result = await getOptions();

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Jobs options error:", error);
    return NextResponse.json(
      { error: "Failed to load job options" },
      { status: 500 },
    );
  }
}
