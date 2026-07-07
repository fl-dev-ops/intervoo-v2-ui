import { z } from "zod";

const educationEntrySchema = z.object({
  degree: z.string(),
  stream: z.string(),
  institution: z.string(),
  graduationYear: z.string(),
  score: z.string(),
});

const experienceEntrySchema = z.object({
  title: z.string(),
  company: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  description: z.string(),
});

const projectEntrySchema = z.object({
  title: z.string(),
  description: z.string(),
});

export const resumeDataSchema = z.object({
  name: z.string(),
  email: z.string(),
  phoneNumber: z.string(),
  role: z.string(),
  experienceYears: z.number().nullable(),
  education: z.array(educationEntrySchema),
  skills: z.array(z.string()),
  experience: z.array(experienceEntrySchema),
  projects: z.array(projectEntrySchema),
  skillGlosses: z.record(z.string(), z.string()).optional(),
  projectKeywords: z.array(z.array(z.string())).optional(),
  projectCapabilities: z.array(z.array(z.string())).optional(),
  workInitiatives: z.array(z.array(z.string())).optional(),
});

export const onboardingResumePayloadSchema = resumeDataSchema.extend({
  resumeUrl: z.string().optional(),
});

export const replaceResumeRequestSchema = z.object({
  action: z.literal("replace-resume"),
  resume: resumeDataSchema,
  resumeUrl: z.string().trim().min(1),
});

export const profileUpdateRequestSchema = resumeDataSchema.pick({
  name: true,
  email: true,
  phoneNumber: true,
  role: true,
  experienceYears: true,
  education: true,
  skills: true,
  experience: true,
  projects: true,
});

export const profileRequestSchema = z.union([
  replaceResumeRequestSchema,
  profileUpdateRequestSchema,
]);

export type ResumeData = z.infer<typeof resumeDataSchema>;
export type OnboardingResumePayload = z.infer<
  typeof onboardingResumePayloadSchema
>;
