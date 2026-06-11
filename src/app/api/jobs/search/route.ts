import { type NextRequest, NextResponse } from "next/server";
import { searchJobs, type SearchInput } from "@/lib/jd-client";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SearchInput;
    const result = await searchJobs({
      companyText: body.companyText ?? "",
      experienceYears: body.experienceYears ?? null,
      projectTexts: body.projectTexts ?? [],
      roleText: body.roleText ?? "",
      skillNames: Array.isArray(body.skillNames) ? body.skillNames : [],
      sort: body.sort ?? "score",
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Jobs search error:", error);
    return NextResponse.json(
      { error: "Failed to search jobs" },
      { status: 500 },
    );
  }
}
