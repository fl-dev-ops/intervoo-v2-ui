import "server-only";

import { prisma } from "@/lib/db";
import type { ResumeData } from "@/lib/resume-schema";

export type PersistResumeData = Omit<ResumeData, "email" | "phoneNumber"> & {
  resumeUrl?: string;
};

export function upsertResumeForUser(userId: string, resume: PersistResumeData) {
  const richFields = {
    ...(resume.skillGlosses === undefined
      ? {}
      : { skillGlosses: resume.skillGlosses }),
    ...(resume.projectKeywords === undefined
      ? {}
      : { projectKeywords: resume.projectKeywords }),
    ...(resume.projectCapabilities === undefined
      ? {}
      : { projectCapabilities: resume.projectCapabilities }),
    ...(resume.workInitiatives === undefined
      ? {}
      : { workInitiatives: resume.workInitiatives }),
    ...(resume.resumeUrl === undefined ? {} : { resumeUrl: resume.resumeUrl }),
  };

  return prisma.resume.upsert({
    where: { userId },
    create: {
      userId,
      name: resume.name.trim(),
      role: resume.role.trim(),
      experienceYears: resume.experienceYears,
      education: resume.education,
      skills: resume.skills,
      experience: resume.experience,
      projects: resume.projects,
      skillGlosses: resume.skillGlosses ?? {},
      projectKeywords: resume.projectKeywords ?? [],
      projectCapabilities: resume.projectCapabilities ?? [],
      workInitiatives: resume.workInitiatives ?? [],
      resumeUrl: resume.resumeUrl,
    },
    update: {
      name: resume.name.trim(),
      role: resume.role.trim(),
      experienceYears: resume.experienceYears,
      education: resume.education,
      skills: resume.skills,
      experience: resume.experience,
      projects: resume.projects,
      ...richFields,
    },
  });
}
