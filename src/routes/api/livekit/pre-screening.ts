import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "#/db.server";
import { auth } from "#/lib/auth.server";
import { startPreScreeningSession } from "#/diagnostic/pre-screening.server";
import type { PreScreeningSetup } from "#/lib/pre-screening-setup";

export async function postHandler({ request }: { request: Request }) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    setup?: PreScreeningSetup;
  };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true },
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const livekitSession = await startPreScreeningSession({
      user: {
        id: user.id,
        name: user.name,
        profile: user.profile,
      },
      setup: body.setup ?? {},
    });

    return Response.json(livekitSession);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to start the LiveKit session",
      },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/livekit/pre-screening")({
  server: {
    handlers: {
      POST: postHandler,
    },
  },
});
