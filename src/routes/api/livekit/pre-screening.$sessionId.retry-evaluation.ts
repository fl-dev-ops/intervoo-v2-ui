import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "#/db.server";
import { asJsonObject } from "#/pre-screening/pre-screening-metadata";
import { retryPreScreenSessionEvaluation } from "#/pre-screening/pre-screening-webhook";
import { auth } from "#/lib/auth.server";

export async function postHandler({
  request,
  params,
}: {
  request: Request;
  params: { sessionId: string };
}) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preScreenSession = await prisma.preScreenSession.findUnique({
    where: { id: params.sessionId },
  });

  if (!preScreenSession) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  const sessionMetadata = asJsonObject(preScreenSession.sessionMetadata);

  if (sessionMetadata.studentId !== session.user.id) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  try {
    await retryPreScreenSessionEvaluation(params.sessionId);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to retry pre-screen evaluation",
      },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/livekit/pre-screening/$sessionId/retry-evaluation")({
  server: {
    handlers: {
      POST: postHandler,
    },
  },
});
