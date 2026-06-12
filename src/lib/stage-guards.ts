import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserStage } from "@/lib/progress";

export type AppStage = "ONBOARDING" | "DIAGNOSTICS" | "COMPLETED";

export async function requireAuthUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session.user;
}

export async function requirePageStage(allowedStages: AppStage[]) {
  const user = await requireAuthUser();
  const stage = await getUserStage(user.id);

  if (!allowedStages.includes(stage)) {
    redirect(getStagePath(stage));
  }

  return { stage, user };
}

export function getStagePath(stage: AppStage) {
  if (stage === "ONBOARDING") {
    return "/onboarding";
  }

  if (stage === "DIAGNOSTICS") {
    return "/diagnostics";
  }

  if (stage === "COMPLETED") {
    return "/diagnostics/final-report";
  }

  return "/";
}

export function isAllowedStage(stage: AppStage, allowedStages: AppStage[]) {
  return allowedStages.includes(stage);
}
