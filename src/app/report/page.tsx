import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePageStage } from "@/lib/stage-guards";

export default async function ReportIndexPage() {
  const { user } = await requirePageStage(["DIAGNOSTICS", "COMPLETED"]);

  const diagnostic = await prisma.diagnostic.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!diagnostic) {
    redirect("/jobs");
  }

  redirect(`/report/${diagnostic.id}`);
}
