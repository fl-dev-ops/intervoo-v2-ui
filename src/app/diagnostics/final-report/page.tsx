import { redirect } from "next/navigation";
import {
  type DiagnosticReportPageState,
  DiagnosticReportPreviewPage,
} from "@/components/diagnostics/report-preview-page";
import { prisma } from "@/lib/db";
import {
  deriveFinalDiagnosticReport,
  ensureFinalDiagnosticShareToken,
} from "@/lib/diagnostics/final-report";
import { updateUserStage } from "@/lib/progress";
import { requirePageStage } from "@/lib/stage-guards";

export default async function DiagnosticsFinalReportPage() {
  const { stage, user } = await requirePageStage(["DIAGNOSTICS", "COMPLETED"]);

  const diagnostic = await prisma.diagnostic.findFirst({
    where: { userId: user.id },
    include: {
      rounds: { include: { session: { include: { report: true } } } },
      user: { include: { profile: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!diagnostic) {
    return (
      <DiagnosticReportPreviewPage
        showActions={false}
        state={{
          errorMessage: "No completed diagnostic was found for this account.",
          status: "unavailable",
        }}
      />
    );
  }

  const report = deriveFinalDiagnosticReport(diagnostic.rounds);

  if (!report) {
    if (stage === "COMPLETED") {
      return (
        <DiagnosticReportPreviewPage
          showActions={false}
          state={{
            errorMessage:
              "Your final report is not available yet. Please check your diagnostic round reports.",
            status: "processing",
          }}
        />
      );
    }

    redirect("/diagnostics/rounds");
  }

  const shareToken = await ensureFinalDiagnosticShareToken(diagnostic.id);
  await updateUserStage(user.id, "COMPLETED");
  await prisma.userProgress.updateMany({
    where: { userId: user.id },
    data: { diagnosticsCompletedAt: new Date() },
  });

  const preferredName = diagnostic.user.profile?.preferredName;
  const state: DiagnosticReportPageState = {
    preferredName,
    report,
    status: "final-ready",
  };

  return (
    <DiagnosticReportPreviewPage
      publicUrl={shareToken ? `/d/${shareToken}` : null}
      showActions
      state={state}
    />
  );
}
