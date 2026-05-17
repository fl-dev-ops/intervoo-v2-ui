import { prisma } from "@/lib/db";

export async function completeInterviewSessionById(sessionId: string) {
  const existingSession = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
  });

  console.info("[diagnostics] complete session by id", {
    existingStatus: existingSession?.status ?? null,
    foundSession: Boolean(existingSession),
    sessionId,
    sessionType: existingSession?.type ?? null,
  });

  const session = await prisma.interviewSession.update({
    where: { id: sessionId },
    data: {
      status: "COMPLETED",
      endedAt: new Date(),
    },
  });

  if (session.type === "DIAGNOSTIC_ROUND") {
    await prisma.diagnosticRound.updateMany({
      where: { sessionId, status: "STARTED" },
      data: { status: "COMPLETED" },
    });
  }

  console.info("[diagnostics] session completed by id", {
    nextStatus: session.status,
    sessionId,
    sessionType: session.type,
  });

  return session;
}

export async function completeInterviewSessionByRoom(roomName: string) {
  const existingSession = await prisma.interviewSession.findUnique({
    where: { roomName },
  });

  console.info("[diagnostics] complete session by room", {
    existingStatus: existingSession?.status ?? null,
    foundSession: Boolean(existingSession),
    roomName,
    sessionId: existingSession?.id ?? null,
    sessionType: existingSession?.type ?? null,
  });

  const session = await prisma.interviewSession.update({
    where: { roomName },
    data: {
      status: "COMPLETED",
      endedAt: new Date(),
    },
  });

  if (session.type === "DIAGNOSTIC_ROUND") {
    await prisma.diagnosticRound.updateMany({
      where: { sessionId: session.id, status: "STARTED" },
      data: { status: "COMPLETED" },
    });
  }

  console.info("[diagnostics] session completed by room", {
    nextStatus: session.status,
    roomName,
    sessionId: session.id,
    sessionType: session.type,
  });

  return session;
}
