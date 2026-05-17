import { prisma } from "@/lib/db";
import { isDiagnosticReportReady } from "@/lib/diagnostics/rules";
import { updateUserStage } from "@/lib/progress";
import { createUniquePublicReportToken } from "@/lib/report-share";
import { buildPublicReportUrl } from "@/lib/share-token";
import { sendWhatsAppReportLink } from "@/lib/twilio";
import { generateDiagnosticReport } from "./diagnostic";
import { generatePreDiagnosticReport } from "./prediagnostic";

export async function generateSessionReport({
  baseUrl,
  sessionId,
}: {
  baseUrl: string;
  sessionId: string;
}) {
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: { report: true },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  console.info("[diagnostics] generate session report state", {
    currentReportStatus: session.report?.status ?? null,
    sessionId,
    sessionStatus: session.status,
    sessionType: session.type,
    userId: session.userId,
  });

  if (
    isDiagnosticReportReady(session.report?.status) &&
    session.report.reportJson
  ) {
    const shareToken =
      session.report.shareToken ?? (await createUniquePublicReportToken());

    if (!session.report.shareToken) {
      await prisma.report.update({
        where: { sessionId: session.id },
        data: { shareToken },
      });
    }

    return { shareToken, status: "READY" as const };
  }

  if (session.report?.status === "PROCESSING") {
    console.info("[diagnostics] generate session report skipped", {
      reason: "already_processing",
      sessionId,
      shareToken: session.report.shareToken,
    });
    return {
      shareToken: session.report.shareToken,
      status: "PROCESSING" as const,
    };
  }

  await prisma.report.upsert({
    where: { sessionId: session.id },
    create: {
      sessionId: session.id,
      status: "PROCESSING",
      startedAt: new Date(),
    },
    update: {
      status: "PROCESSING",
      errorMessage: null,
      startedAt: new Date(),
      completedAt: null,
      failedAt: null,
    },
  });

  let reportJson: unknown;

  try {
    if (session.type === "PREDIAGNOSTIC") {
      reportJson = await generatePreDiagnosticReport(session.id);
    } else if (session.type === "DIAGNOSTIC_ROUND") {
      reportJson = await generateDiagnosticReport(session.id);
    } else {
      throw new Error(`Unsupported session type: ${session.type}`);
    }
  } catch (generationError) {
    const message =
      generationError instanceof Error
        ? generationError.message
        : "Report generation failed";

    await prisma.report.update({
      where: { sessionId: session.id },
      data: {
        status: "FAILED",
        errorMessage: message,
        failedAt: new Date(),
      },
    });

    console.info("[diagnostics] generate session report failed", {
      error: message,
      sessionId,
      sessionType: session.type,
    });

    throw generationError;
  }

  const existingReport = await prisma.report.findUnique({
    where: { sessionId: session.id },
    select: { shareToken: true },
  });
  const shareToken =
    existingReport?.shareToken ?? (await createUniquePublicReportToken());

  await prisma.report.update({
    where: { sessionId: session.id },
    data: {
      reportJson: reportJson as object,
      status: "READY",
      completedAt: new Date(),
      shareToken,
    },
  });

  await prisma.interviewSession.update({
    where: { id: session.id },
    data: { status: "COMPLETED" },
  });

  if (session.type === "DIAGNOSTIC_ROUND") {
    await prisma.diagnosticRound.updateMany({
      where: { sessionId: session.id },
      data: { status: "COMPLETED" },
    });
  }

  if (session.type === "PREDIAGNOSTIC") {
    await updateUserStage(session.userId, "DIAGNOSTICS");
    await prisma.userProgress.updateMany({
      where: { userId: session.userId },
      data: { prediagnosticsCompletedAt: new Date() },
    });
  }

  await sendReportLink({
    baseUrl,
    sessionType: session.type,
    shareToken,
    userId: session.userId,
  });

  console.info("[diagnostics] generate session report ready", {
    sessionId,
    sessionType: session.type,
    shareToken,
    userId: session.userId,
  });

  return { shareToken, status: "READY" as const };
}

async function sendReportLink({
  baseUrl,
  sessionType,
  shareToken,
  userId,
}: {
  baseUrl: string;
  sessionType: "PREDIAGNOSTIC" | "DIAGNOSTIC_ROUND";
  shareToken: string;
  userId: string;
}) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, phoneNumber: true },
    });

    if (!user?.phoneNumber) {
      return;
    }

    const reportType = sessionType === "PREDIAGNOSTIC" ? "pre" : "diag";
    const reportUrl = buildPublicReportUrl(baseUrl, shareToken, reportType);
    await sendWhatsAppReportLink(
      user.phoneNumber,
      user.name || "Learner",
      reportUrl,
      sessionType === "PREDIAGNOSTIC" ? "prediagnostic" : "diagnostic",
    );
  } catch (whatsappError) {
    console.error("Failed to send WhatsApp report link:", whatsappError);
  }
}
