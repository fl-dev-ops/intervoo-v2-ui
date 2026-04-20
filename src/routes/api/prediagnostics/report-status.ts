import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth.server";
import {
  getLatestPreDiagnosticSessionStatus,
  getPreDiagnosticSessionStatus,
} from "#/lib/prediagnostics/report.server";

export async function getHandler({ request }: { request: Request }) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    const latest = await getLatestPreDiagnosticSessionStatus(session.user.id);

    if (!latest) {
      return Response.json({ error: "Pre-diagnostic session not found" }, { status: 404 });
    }

    return Response.json(latest, { status: 200 });
  }

  const result = await getPreDiagnosticSessionStatus({
    sessionId,
    userId: session.user.id,
  });

  if (!result) {
    return Response.json({ error: "Pre-diagnostic session not found" }, { status: 404 });
  }

  return Response.json(result, { status: 200 });
}

export const Route = createFileRoute("/api/prediagnostics/report-status")({
  server: {
    handlers: {
      GET: getHandler,
    },
  },
});
