import { createFileRoute } from "@tanstack/react-router";
import { getPreScreeningSessionStatus } from "#/diagnostic/pre-screening.server";
import { auth } from "#/lib/auth.server";

export async function getHandler({
  request,
  params,
}: {
  request: Request;
  params: { sessionId: string };
}) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preScreenSession = await getPreScreeningSessionStatus({
    sessionId: params.sessionId,
    userId: session.user.id,
  });

  if (!preScreenSession) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  return Response.json(preScreenSession);
}

export const Route = createFileRoute("/api/livekit/pre-screening/$sessionId")({
  server: {
    handlers: {
      GET: getHandler,
    },
  },
});
