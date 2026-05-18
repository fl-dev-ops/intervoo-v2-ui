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

export default async function PrediagnosticsReportPage() {
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

  const interviewSession = await prisma.interviewSession.findFirst({
    where: { userId: session.user.id, type: "PREDIAGNOSTIC" },
    include: {
      report: true,
      user: { include: { profile: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const state = getReportPageState({
    authUserId: session.user.id,
    interviewSession,
  });

  return <PrediagnosticsReportPreviewPage state={state} />;
}

function getReportPageState({
  authUserId,
  interviewSession,
}: {
  authUserId: string;
  interviewSession: ReportPageInterviewSession | null;
}): PrediagnosticsReportPageState {
  if (!interviewSession) {
    return {
      errorMessage:
        "No pre-diagnostic session was found for this account. It may still be processing.",
      status: "unavailable",
    };
  }

  if (
    interviewSession.userId !== authUserId ||
    interviewSession.type !== "PREDIAGNOSTIC"
  ) {
    return {
      errorMessage:
        "No pre-diagnostic report was found for this account. It may still be processing.",
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
