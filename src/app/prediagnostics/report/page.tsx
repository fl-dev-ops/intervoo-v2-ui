import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  type PrediagnosticsReportPageState,
  PrediagnosticsReportPreviewPage,
  type PrediagnosticsReportPreviewReport,
} from "@/components/prediagnostics/report-preview-page";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserStage } from "@/lib/progress";

type ReportPageInterviewSession = {
  report: {
    errorMessage: string | null;
    reportJson: unknown;
    status: string;
  } | null;
  type: string;
  user: { profile: { preferredName: string } | null };
  userId: string;
};

export default async function PrediagnosticsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session: sessionId } = await searchParams;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/login");
  }

  const stage = await getUserStage(session.user.id);
  if (stage === "ONBOARDING") {
    redirect("/onboarding");
  }

  const interviewSession = sessionId
    ? await prisma.interviewSession.findUnique({
        where: { id: sessionId },
        include: {
          report: true,
          user: { include: { profile: true } },
        },
      })
    : null;

  const state = getReportPageState({
    authUserId: session.user.id,
    interviewSession,
    sessionId,
  });

  return <PrediagnosticsReportPreviewPage state={state} />;
}

function getReportPageState({
  authUserId,
  interviewSession,
  sessionId,
}: {
  authUserId: string;
  interviewSession: ReportPageInterviewSession | null;
  sessionId?: string;
}): PrediagnosticsReportPageState {
  if (!sessionId || !interviewSession) {
    return {
      errorMessage:
        "No report found for this session. It may still be processing or the session ID is invalid.",
      status: "unavailable",
    };
  }

  if (
    interviewSession.userId !== authUserId ||
    interviewSession.type !== "PREDIAGNOSTIC"
  ) {
    return {
      errorMessage:
        "No report found for this session. It may still be processing or the session ID is invalid.",
      status: "unavailable",
    };
  }

  const preferredName = interviewSession.user.profile?.preferredName;

  if (!interviewSession.report) {
    return { preferredName, status: "processing" };
  }

  if (interviewSession.report.status === "FAILED") {
    return {
      errorMessage:
        interviewSession.report.errorMessage ?? "Report generation failed.",
      preferredName,
      status: "failed",
    };
  }

  if (interviewSession.report.status !== "READY") {
    return {
      preferredName,
      status:
        interviewSession.report.status === "PENDING" ? "pending" : "processing",
    };
  }

  const report = toPrediagnosticsReport(interviewSession.report.reportJson);

  if (!report) {
    return {
      errorMessage: "The report is ready, but its data is missing.",
      preferredName,
      status: "failed",
    };
  }

  return { preferredName, report, status: "ready" };
}

function toPrediagnosticsReport(
  reportJson: unknown,
): PrediagnosticsReportPreviewReport | null {
  if (
    !reportJson ||
    typeof reportJson !== "object" ||
    Array.isArray(reportJson)
  ) {
    return null;
  }

  return reportJson as PrediagnosticsReportPreviewReport;
}
