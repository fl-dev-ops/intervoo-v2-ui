import { prisma } from "@/lib/db";

export async function completeInterviewSessionById(sessionId: string) {
  const existingSession = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
  });

  const session = await prisma.interviewSession.update({
    where: { id: sessionId },
    data: {
      status:
        existingSession?.status === "REPORT_READY"
          ? "REPORT_READY"
          : "COMPLETED",
      endedAt: new Date(),
    },
  });

  if (session.type === "DIAGNOSTIC_ROUND") {
    await prisma.diagnosticRound.updateMany({
      where: { sessionId, status: "STARTED" },
      data: { status: "COMPLETED" },
    });
  }

  return session;
}

export async function completeInterviewSessionByRoom(roomName: string) {
  const existingSession = await prisma.interviewSession.findUnique({
    where: { roomName },
  });

  const session = await prisma.interviewSession.update({
    where: { roomName },
    data: {
      status:
        existingSession?.status === "REPORT_READY"
          ? "REPORT_READY"
          : "COMPLETED",
      endedAt: new Date(),
    },
  });

  if (session.type === "DIAGNOSTIC_ROUND") {
    await prisma.diagnosticRound.updateMany({
      where: { sessionId: session.id, status: "STARTED" },
      data: { status: "COMPLETED" },
    });
  }

  return session;
}
