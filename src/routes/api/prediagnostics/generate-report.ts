import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth.server";
import {
  getDiagnosticSessionStatus,
  triggerDiagnosticSessionEvaluation,
} from "#/lib/prediagnostics/report.server";

export async function postHandler({ request }: { request: Request }) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    sessionId?: unknown;
  } | null;

  if (!body || typeof body.sessionId !== "string") {
    return Response.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const currentStatus = await getDiagnosticSessionStatus({
    sessionId: body.sessionId,
    userId: session.user.id,
  });

  if (!currentStatus) {
    return Response.json({ error: "Diagnostic session not found" }, { status: 404 });
  }

  if (currentStatus.report?.status !== "READY") {
    await triggerDiagnosticSessionEvaluation(body.sessionId);
  }

  const nextStatus = await getDiagnosticSessionStatus({
    sessionId: body.sessionId,
    userId: session.user.id,
  });

  return Response.json(nextStatus, { status: 200 });
}

export const Route = createFileRoute("/api/prediagnostics/generate-report")({
  server: {
    handlers: {
      POST: postHandler,
    },
  },
});
