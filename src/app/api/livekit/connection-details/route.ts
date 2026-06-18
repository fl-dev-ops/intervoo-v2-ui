import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";
import { WorkflowRunFailedError } from "workflow/internal/errors";
import { auth } from "@/lib/auth";
import { createDiagnosticSessionWorkflow } from "@/workflows/diagnostic-session";

type ConnectionDetailsBody = {
  type?: unknown;
  coach?: unknown;
  diagnostic_id?: unknown;
  round_id?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ConnectionDetailsBody;

    if (body.type !== "DIAGNOSTIC_ROUND") {
      return NextResponse.json(
        { error: "Invalid session type" },
        { status: 400 },
      );
    }

    const roundId = typeof body.round_id === "string" ? body.round_id : "";
    const diagnosticId =
      typeof body.diagnostic_id === "string" ? body.diagnostic_id : "";
    const coach = body.coach === "arjun" ? "arjun" : "Sara";
    const baseUrl = process.env.WEBHOOK_BASE_URL || request.nextUrl.origin;

    if (!diagnosticId) {
      return NextResponse.json(
        { error: "Missing diagnostic ID" },
        { status: 400 },
      );
    }

    console.info("[diagnostics] connection-details workflow request", {
      coach,
      diagnosticId,
      requestedRoundId: roundId || null,
      sessionType: body.type,
      userId: session.user.id,
    });

    const run = await start(createDiagnosticSessionWorkflow, [
      {
        baseUrl,
        coach,
        diagnosticId,
        roundId,
        userId: session.user.id,
      },
    ]);
    const result = await getDiagnosticSessionWorkflowResult(run.returnValue);

    console.info("[diagnostics] connection-details workflow completed", {
      roomName: result.room_name,
      roundId: result.round_id,
      sessionId: result.session_id,
      userId: session.user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("LiveKit connection details error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: getErrorStatus(error) },
    );
  }
}

async function getDiagnosticSessionWorkflowResult(
  returnValue: Promise<unknown>,
) {
  try {
    return (await returnValue) as Awaited<
      ReturnType<typeof createDiagnosticSessionWorkflow>
    >;
  } catch (error) {
    if (WorkflowRunFailedError.is(error)) {
      throw new Error(getWorkflowRunFailedMessage(error));
    }
    throw error;
  }
}

function getErrorStatus(error: unknown) {
  const message = getErrorMessage(error);
  if (message.includes("Invalid round ID")) return 400;
  if (message.includes("Missing diagnostic ID")) return 400;
  if (
    [
      "Invalid session type",
      "Diagnostic not found",
      "Round already started",
      "Select a job before starting a round",
      "Diagnostics are not available for this user stage",
    ].some((value) => message.includes(value))
  ) {
    return 409;
  }
  if (message.includes("User not found")) return 404;
  return 500;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "Failed to create connection details";
}

function getWorkflowRunFailedMessage(error: WorkflowRunFailedError) {
  return error.cause.message || error.message || "Failed to create session";
}
