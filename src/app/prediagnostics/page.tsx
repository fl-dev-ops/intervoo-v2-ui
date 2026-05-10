import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { getUserStage } from "@/lib/progress";

export default async function PrediagnosticsPage() {
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

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-5 py-8">
      <section className="mx-auto w-full max-w-lg space-y-6 text-center">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            Pre-diagnostic
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Start with a quick conversation
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            This short session helps us understand your goals, comfort level,
            and the roles you are preparing for before diagnostics begin.
          </p>
        </div>

        <Link
          className={buttonVariants({ className: "mx-auto", size: "lg" })}
          href="/prediagnostics/screening"
        >
          Take pre-diagnostic
        </Link>
      </section>
    </main>
  );
}
