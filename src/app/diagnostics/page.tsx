import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSelectedJobId } from "@/lib/diagnostics/selected-job";
import { requirePageStage } from "@/lib/stage-guards";

export default async function DiagnosticsPage() {
  const { user } = await requirePageStage(["DIAGNOSTICS"]);

  const diagnostic = await prisma.diagnostic.findFirst({
    where: { userId: user.id },
    select: { id: true, selectedJob: true },
    orderBy: { createdAt: "desc" },
  });

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
