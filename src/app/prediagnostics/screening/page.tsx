import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CustomPreJoin } from "@/components/prediagnostics/custom-prejoin";
import { auth } from "@/lib/auth";
import { getUserStage } from "@/lib/progress";

export default async function PrediagnosticsScreeningPage() {
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

  if (stage === "DIAGNOSTICS") {
    redirect("/diagnostics");
  }

  return <CustomPreJoin type="audio" />;
}
