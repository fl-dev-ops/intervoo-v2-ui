import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type AskedQuestion = Record<string, unknown> & {
  id?: string;
  text?: string;
};

function questionKey(question: AskedQuestion): string {
  if (typeof question.id === "string" && question.id) return question.id;
  if (typeof question.text === "string" && question.text.trim()) {
    return question.text.trim();
  }
  return "";
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      sessionId?: string;
      question?: AskedQuestion;
    };

    if (!body.sessionId || !body.question) {
      return NextResponse.json(
        { error: "Missing sessionId or question" },
        { status: 400 },
      );
    }

    const incomingKey = questionKey(body.question);
    if (!incomingKey) {
      return NextResponse.json(
        { error: "Question has no id or text" },
        { status: 400 },
      );
    }

    const interviewSession = await prisma.interviewSession.findUnique({
      where: { id: body.sessionId },
      select: { userId: true, metadata: true },
    });

    if (!interviewSession || interviewSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const metadata =
      interviewSession.metadata &&
      typeof interviewSession.metadata === "object" &&
      !Array.isArray(interviewSession.metadata)
        ? (interviewSession.metadata as Record<string, unknown>)
        : {};

    const existing = Array.isArray(metadata.asked_questions)
      ? (metadata.asked_questions as AskedQuestion[])
      : [];

    if (existing.some((q) => questionKey(q) === incomingKey)) {
      return NextResponse.json({ success: true, deduped: true });
    }

    const updatedMetadata = {
      ...metadata,
      asked_questions: [...existing, body.question],
    };

    await prisma.interviewSession.update({
      where: { id: body.sessionId },
      data: { metadata: updatedMetadata as object },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Asked-question persist error:", error);
    return NextResponse.json(
      { error: "Failed to persist asked question" },
      { status: 500 },
    );
  }
}
