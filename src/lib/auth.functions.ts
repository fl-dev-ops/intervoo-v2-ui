import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { prisma } from "#/db.server";
import { auth } from "#/lib/auth.server";

type OnboardingInput = {
  name: string;
  email: string;
  institution: string;
  degree: string;
  stream: string;
  yearOfStudy: string;
};

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequest().headers;
  const session = await auth.api.getSession({ headers });

  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true },
  });

  if (!user) {
    return null;
  }

  return {
    ...session,
    user,
  };
});

export const completeOnboarding = createServerFn({ method: "POST" })
  .inputValidator((data: OnboardingInput) => data)
  .handler(async ({ data }) => {
    const headers = getRequest().headers;
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw new Error("Unauthorized");
    }

    const normalizedEmail = data.email.trim().toLowerCase();

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: data.name.trim(),
        email: normalizedEmail,
        hasCompletedOnboarding: true,
        profile: {
          upsert: {
            create: {
              institution: data.institution.trim(),
              degree: data.degree,
              stream: data.stream.trim(),
              yearOfStudy: data.yearOfStudy,
            },
            update: {
              institution: data.institution.trim(),
              degree: data.degree,
              stream: data.stream.trim(),
              yearOfStudy: data.yearOfStudy,
            },
          },
        },
      },
    });

    return { success: true };
  });
