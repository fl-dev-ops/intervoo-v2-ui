import { redirect } from "next/navigation";
import { getLockedDiagnosticForUser } from "@/lib/diagnostics/jd-progress";
import { getSelectedJobId } from "@/lib/diagnostics/selected-job";
import { requirePageStage } from "@/lib/stage-guards";

export default async function DiagnosticsPage() {
  const { user } = await requirePageStage(["DIAGNOSTICS", "COMPLETED"]);

  const diagnostic = await getLockedDiagnosticForUser(user.id);

  const selectedJobId = getSelectedJobId(diagnostic?.selectedJob);

  console.info("[diagnostics] route state", {
    userId: user.id,
    diagnosticId: diagnostic?.id ?? null,
    selectedJobId,
  });

  if (!selectedJobId) {
    redirect("/jobs");
  }

  redirect(`/jobs/${selectedJobId}`);
}
