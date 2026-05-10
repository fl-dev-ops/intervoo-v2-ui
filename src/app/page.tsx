import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserStage } from "@/lib/progress";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const stage = await getUserStage(session.user.id);

  if (stage === "ONBOARDING") {
    redirect("/onboarding");
  }

  if (stage === "PREDIAGNOSTICS") {
    redirect("/prediagnostics");
  }

  if (stage === "DIAGNOSTICS") {
    redirect("/diagnostics");
  }

  if (stage === "COMPLETED") {
    redirect("/diagnostics/final-report");
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background p-6 text-center">
      <h1 className="text-xl font-bold">Diagnostics | Intervoo.ai</h1>
      <p className="text-sm text-muted-foreground">You are logged in.</p>
    </main>
  );
}
