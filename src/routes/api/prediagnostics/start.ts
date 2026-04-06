import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "#/db.server";
import { auth } from "#/lib/auth.server";
import {
  buildPrediagnosticsParticipantIdentity,
  buildPrediagnosticsParticipantName,
  buildPrediagnosticsRoomName,
  createPrediagnosticsConnectionDetails,
} from "#/prediagnostics/server";

export async function postHandler({ request }: { request: Request }) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true },
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const participantName = buildPrediagnosticsParticipantName(user.name);
    const connectionDetails = await createPrediagnosticsConnectionDetails({
      roomName: buildPrediagnosticsRoomName(user.id),
      participantIdentity: buildPrediagnosticsParticipantIdentity(user.id),
      participantName,
      participantMetadata: JSON.stringify({
        userId: user.id,
        email: user.email,
        feature: "prediagnostics",
      }),
      roomMetadata: JSON.stringify({
        feature: "prediagnostics",
        userId: user.id,
        studentName: participantName,
        studentEmail: user.email,
      }),
      agentName: "local-diagnostics",
      agentMetadata: JSON.stringify({
        studentId: user.id,
        studentName: participantName,
        studentEmail: user.email,
      }),
    });

    return Response.json(connectionDetails, { status: 200 });
  } catch (error) {
    console.error("[prediagnostics token endpoint]", error);

    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to create prediagnostics token",
      },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/prediagnostics/start")({
  server: {
    handlers: {
      POST: postHandler,
    },
  },
});
