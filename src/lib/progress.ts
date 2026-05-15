import { prisma } from "@/lib/db";

export async function getUserProgress(userId: string) {
  return prisma.userProgress.findUnique({
    where: { userId },
  });
}

export async function getOrCreateUserProgress(userId: string) {
  return prisma.userProgress.upsert({
    where: { userId },
    create: {
      userId,
      stage: "ONBOARDING",
    },
    update: {},
  });
}

export async function getUserStage(userId: string) {
  const progress = await getUserProgress(userId);
  return progress?.stage ?? "ONBOARDING";
}

export async function updateUserStage(
  userId: string,
  stage: "ONBOARDING" | "PREDIAGNOSTICS" | "DIAGNOSTICS" | "COMPLETED",
) {
  return prisma.userProgress.upsert({
    where: { userId },
    create: {
      userId,
      stage,
    },
    update: {
      stage,
    },
  });
}
