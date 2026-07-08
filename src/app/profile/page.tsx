"use client";

import { IconDeviceFloppyFilled } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, CloudUpload, FileText, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { ChangeResumeDialog } from "@/components/jobs/change-resume-dialog";
import {
  BasicInfoCard,
  EducationCard,
  ExperienceCard,
  ProjectsCard,
  ResumeParsingSkeleton,
  SkillsCard,
} from "@/components/onboarding";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useProfile, useUpdateProfile } from "@/hooks/profile/hooks";
import { authClient } from "@/lib/auth-client";
import type { ResumeData, ResumeSection } from "@/lib/resume-client";
import {
  PENDING_RESUME_STORAGE_KEY,
  parseUploadedResume,
} from "@/lib/resume-upload-client";

interface EducationEntry {
  degree: string;
  stream: string;
  institution: string;
  graduationYear: string;
  score: string;
}

interface ExperienceEntry {
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface ProjectEntry {
  title: string;
  description: string;
}

interface ProfileData {
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  experienceYears: number | null;
  education: EducationEntry[];
  skills: string[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
}

type EditableSection =
  | "basic"
  | "education"
  | "skills"
  | "experience"
  | "projects";
type ValidationErrors = Partial<
  Record<"name" | "email" | "phoneNumber", string>
>;

export default function ProfilePage() {
  const router = useRouter();
  const profileQuery = useProfile();
  const saveMutation = useUpdateProfile();
  const [data, setData] = useState<ProfileData | null>(null);
  const [isChangeResumeOpen, setIsChangeResumeOpen] = useState(false);
  const [loadedSections, setLoadedSections] = useState<ResumeSection[]>([]);
  const [parsingResumeData, setParsingResumeData] = useState<ResumeData | null>(
    null,
  );
  const [editingSections, setEditingSections] = useState<
    Record<EditableSection, boolean>
  >({
    basic: false,
    education: false,
    skills: false,
    experience: false,
    projects: false,
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState("");
  const parseStartedRef = useRef(false);

  // Streams a pending uploaded resume, then persists it via replace-resume.
  const parseMutation = useMutation({
    mutationFn: async ({
      resumeUrl,
      profileData,
    }: {
      resumeUrl: string;
      profileData: ProfileData;
    }) => {
      setLoadedSections([]);
      setParsingResumeData(createEmptyResume(profileData));
      const result = await parseUploadedResume(resumeUrl, {
        async onEvent(event) {
          if (event.type !== "section") return;
          setParsingResumeData((current) => ({
            ...(current ?? createEmptyResume(profileData)),
            ...event.data,
          }));
          setLoadedSections((current) =>
            current.includes(event.section)
              ? current
              : [...current, event.section],
          );
          await waitForPaint();
        },
      });
      const parsedResume = mergeWithProfileDefaults(result.resume, profileData);
      const saveResponse = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "replace-resume",
          resume: parsedResume,
          resumeUrl: result.resumeUrl,
        }),
      });
      if (!saveResponse.ok) {
        const saveError = (await saveResponse.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(saveError?.error || "Failed to replace resume");
      }
      return parsedResume;
    },
    onSuccess: (parsedResume) => {
      setData(parsedResume);
      setParsingResumeData(parsedResume);
      router.replace("/profile", { scroll: false });
    },
    onError: (error) => {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to replace resume",
      );
    },
  });

  const isLoading = profileQuery.isPending;
  const isSaving = saveMutation.isPending;
  const isParsingResume = parseMutation.isPending;

  // A failed profile load means the session is gone.
  useEffect(() => {
    if (profileQuery.isError) router.push("/login");
  }, [profileQuery.isError, router]);

  // Seed the editable draft from the loaded profile, then kick off a pending
  // resume parse (from the upload flow) once.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once when the profile first loads
  useEffect(() => {
    const payload = profileQuery.data;
    if (!payload) return;
    const resume = payload.resume;
    const profileData: ProfileData = {
      name: resume?.name || payload.name || "",
      email: payload.email || "",
      phoneNumber: payload.phoneNumber || "",
      role: resume?.role || "",
      experienceYears: resume?.experienceYears ?? null,
      education: (resume?.education ?? []) as EducationEntry[],
      skills: (resume?.skills ?? []) as string[],
      experience: (resume?.experience ?? []) as ExperienceEntry[],
      projects: (resume?.projects ?? []) as ProjectEntry[],
    };
    setData(profileData);

    if (parseStartedRef.current) return;
    const pendingResumeUrl = window.sessionStorage.getItem(
      PENDING_RESUME_STORAGE_KEY,
    );
    if (!pendingResumeUrl) return;
    parseStartedRef.current = true;
    window.sessionStorage.removeItem(PENDING_RESUME_STORAGE_KEY);
    parseMutation.mutate({ resumeUrl: pendingResumeUrl, profileData });
  }, [profileQuery.data]);

  const toggleSection = (section: EditableSection) => {
    setEditingSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleBasicInfoChange = (field: string, value: string) => {
    setData((prev) => (prev ? { ...prev, [field]: value } : prev));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSubmitError("");
  };

  const handleSave = useCallback(async () => {
    if (!data) return;

    const validationErrors: ValidationErrors = {};
    if (!data.name.trim()) validationErrors.name = "Name is required";
    if (!data.email.trim()) {
      validationErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      validationErrors.email = "Enter a valid email address";
    }
    if (!data.phoneNumber.trim()) {
      validationErrors.phoneNumber = "Phone number is required";
    } else if (!/^[+\d][\d\s()-]{7,}$/.test(data.phoneNumber.trim())) {
      validationErrors.phoneNumber = "Enter a valid phone number";
    }

    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setEditingSections((prev) => ({ ...prev, basic: true }));
      setSubmitError("Please fix the highlighted fields before saving.");
      return;
    }

    setSubmitError("");

    try {
      await saveMutation.mutateAsync(data);
      router.replace("/jobs");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to save profile",
      );
    }
  }, [data, router, saveMutation]);

  const handleLogout = useCallback(async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push("/login"),
      },
    });
  }, [router]);

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F1FF] font-sans">
      <AppHeader
        user={{ email: data.email, name: data.name }}
        onLogout={handleLogout}
      />
      {isParsingResume ? (
        <ResumeParsingSkeleton
          email={data.email}
          loadedSections={loadedSections}
          name={data.name}
          phoneNumber={data.phoneNumber}
          resumeData={parsingResumeData}
        />
      ) : (
        <div className="mx-auto w-full max-w-[560px] px-4 pb-14 pt-8 md:pt-10">
          <button
            type="button"
            onClick={() => router.push("/jobs")}
            className="mb-6 inline-flex items-center gap-2 text-base font-semibold text-black"
          >
            <ArrowLeft className="size-5" />
            Back
          </button>

          <div className="mb-7 text-center">
            <h2 className="text-lg font-extrabold tracking-tight text-black">
              Your Profile
            </h2>
            <p className="mt-1 text-sm text-[#6D6873]">
              Review and update your details
            </p>
          </div>

          <div className="mb-7 flex flex-col items-stretch gap-3 rounded-2xl bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <a
              className="flex items-center gap-2 rounded-xl bg-[#F7F3F8] px-3 py-2 text-base font-semibold text-black transition-colors hover:bg-[#EFE8F5] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              href="/api/profile/resume"
              rel="noreferrer"
              target="_blank"
            >
              <FileText className="size-4 text-[#5C3BD8]" />
              My Resume
            </a>
            <Button
              onClick={() => setIsChangeResumeOpen(true)}
              type="button"
              variant="secondary"
            >
              <CloudUpload />
              Change my Resume
            </Button>
          </div>

          <div className="space-y-4">
            <BasicInfoCard
              name={data.name}
              email={data.email}
              phoneNumber={data.phoneNumber}
              editing={editingSections.basic}
              errors={errors}
              onChange={handleBasicInfoChange}
              onEdit={() => toggleSection("basic")}
            />

            <EducationCard
              education={data.education}
              editing={editingSections.education}
              onChange={(education) =>
                setData((prev) => (prev ? { ...prev, education } : prev))
              }
              onEdit={() => toggleSection("education")}
            />

            <SkillsCard
              skills={data.skills}
              editing={editingSections.skills}
              onChange={(skills) =>
                setData((prev) => (prev ? { ...prev, skills } : prev))
              }
              onEdit={() => toggleSection("skills")}
            />

            <ExperienceCard
              experience={data.experience}
              editing={editingSections.experience}
              onChange={(experience) =>
                setData((prev) => (prev ? { ...prev, experience } : prev))
              }
              onEdit={() => toggleSection("experience")}
            />

            <ProjectsCard
              projects={data.projects}
              editing={editingSections.projects}
              onChange={(projects) =>
                setData((prev) => (prev ? { ...prev, projects } : prev))
              }
              onEdit={() => toggleSection("projects")}
            />
          </div>

          {submitError && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {submitError}
            </p>
          )}

          <div className="mt-6">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="h-[54px] w-full rounded-full bg-gradient-to-r from-[#5436B8] to-[#7149F6] text-base font-bold text-white shadow-none hover:from-[#4B2EAA] hover:to-[#6846E8]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <IconDeviceFloppyFilled className="mr-2 size-4" />
                  Save Profile
                </>
              )}
            </Button>
          </div>

          <ChangeResumeDialog
            onOpenChange={setIsChangeResumeOpen}
            open={isChangeResumeOpen}
          />
        </div>
      )}
    </div>
  );
}

function createEmptyResume(profile: ProfileData): ResumeData {
  return {
    name: profile.name,
    email: profile.email,
    phoneNumber: profile.phoneNumber,
    role: "",
    experienceYears: null,
    education: [],
    skills: [],
    experience: [],
    projects: [],
  };
}

function mergeWithProfileDefaults(
  resume: ResumeData,
  profile: ProfileData,
): ResumeData {
  return {
    ...resume,
    name: resume.name || profile.name,
    email: resume.email || profile.email,
    phoneNumber: resume.phoneNumber || profile.phoneNumber,
  };
}

function waitForPaint() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}
