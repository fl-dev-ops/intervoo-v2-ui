import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth.server";
import { finalizePreDiagnosticSession } from "#/lib/prediagnostics/report.server";

export async function postHandler({ request }: { request: Request }) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    sessionId?: unknown;
    transcript?: unknown;
    messages?: unknown;
  } | null;

  if (!body || typeof body.sessionId !== "string") {
    return Response.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const result = await finalizePreDiagnosticSession({
    sessionId: body.sessionId,
    userId: session.user.id,
    transcript: body.transcript,
    messages: body.messages,
  });

  if (!result) {
    return Response.json({ error: "Pre-diagnostic session not found" }, { status: 404 });
  }

  if (result.transcriptMessageCount === 0) {
    return Response.json(
      {
        error: "No transcript was available to finalize",
        sessionId: result.sessionId,
        transcriptMessageCount: result.transcriptMessageCount,
      },
      { status: 409 },
    );
  }

  return Response.json(
    {
      sessionId: result.sessionId,
      transcriptMessageCount: result.transcriptMessageCount,
    },
    { status: 200 },
  );
}

export const Route = createFileRoute("/api/prediagnostics/complete")({
  server: {
    handlers: {
      POST: postHandler,
    },
  },
});
