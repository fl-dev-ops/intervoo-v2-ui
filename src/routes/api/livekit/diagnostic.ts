import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth.server";
import { startDiagnosticInterviewSession } from "#/diagnostic/diagnostic.server";

export async function postHandler({ request }: { request: Request }) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const livekitSession = await startDiagnosticInterviewSession({
      user: {
        id: session.user.id,
        name: session.user.name,
      },
    });

    return Response.json(livekitSession);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to start diagnostic interview session",
      },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/livekit/diagnostic")({
  server: {
    handlers: {
      POST: postHandler,
    },
  },
});
