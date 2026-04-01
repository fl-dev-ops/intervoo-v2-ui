import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "#/db.server";
import {
  buildPreScreenSessionTranscript,
  sanitizePreScreenTranscriptMessages,
} from "#/diagnostic/pre-screening-transcript";
import { asJsonObject, toJsonValue } from "#/diagnostic/pre-screening-metadata";
import { triggerPreScreenSessionEvaluation } from "#/diagnostic/pre-screening-webhook";
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

export async function postHandler({
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

  const preScreenSession = await prisma.preScreenSession.findUnique({
    where: { id: params.sessionId },
    include: { report: true },
  });

  if (!preScreenSession) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  const sessionMetadata = asJsonObject(preScreenSession.sessionMetadata);

  if (sessionMetadata.studentId !== session.user.id) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const body = asJsonObject(payload);
  const messages = sanitizePreScreenTranscriptMessages(body.messages);

  if (messages.length === 0) {
    return Response.json({ error: "No transcript messages provided" }, { status: 400 });
  }

  const now = new Date();
  const shouldTriggerEvaluation =
    !preScreenSession.report || preScreenSession.report.status === "PENDING";

  await prisma.preScreenSession.update({
    where: { id: preScreenSession.id },
    data: {
      transcript: toJsonValue(buildPreScreenSessionTranscript(messages)),
      endedAt: preScreenSession.endedAt ?? now,
      status: preScreenSession.status === "REPORT_READY" ? "REPORT_READY" : "COMPLETED",
    },
  });

  if (shouldTriggerEvaluation) {
    void triggerPreScreenSessionEvaluation(preScreenSession.id).catch((error) => {
      console.error("[pre-screen finalize] evaluation trigger failed", error);
    });
  }

  return Response.json({
    success: true,
    messageCount: messages.length,
    evaluationTriggered: shouldTriggerEvaluation,
  });
}

export const Route = createFileRoute("/api/livekit/pre-screening/$sessionId")({
  server: {
    handlers: {
      GET: getHandler,
      POST: postHandler,
    },
  },
});
