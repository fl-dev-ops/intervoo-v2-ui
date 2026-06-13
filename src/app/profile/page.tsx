"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { IconDeviceFloppyFilled } from "@tabler/icons-react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import {
  BasicInfoCard,
  EducationCard,
  SkillsCard,
  ExperienceCard,
  ProjectsCard,
} from "@/components/onboarding";

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

type EditableSection = "basic" | "education" | "skills" | "experience" | "projects";
type ValidationErrors = Partial<Record<"name" | "email" | "phoneNumber", string>>;

export default function ProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingSections, setEditingSections] = useState<Record<EditableSection, boolean>>({
    basic: false,
    education: false,
    skills: false,
    experience: false,
    projects: false,
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch("/api/profile");
        if (!response.ok) {
          router.push("/login");
          return;
        }
        const payload = await response.json();
        const resume = payload.resume;
        setData({
          name: resume?.name || payload.name || "",
          email: payload.email || "",
          phoneNumber: payload.phoneNumber || "",
          role: resume?.role || "",
          experienceYears: resume?.experienceYears ?? null,
          education: (resume?.education ?? []) as EducationEntry[],
          skills: (resume?.skills ?? []) as string[],
          experience: (resume?.experience ?? []) as ExperienceEntry[],
          projects: (resume?.projects ?? []) as ProjectEntry[],
        });
      } catch {
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, [router]);

  const toggleSection = (section: EditableSection) => {
    setEditingSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleBasicInfoChange = (field: string, value: string) => {
    setData((prev) => (prev ? { ...prev, [field]: value } : prev));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSubmitError("");
    setSubmitSuccess(false);
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

    setIsSaving(true);
    setSubmitError("");
    setSubmitSuccess(false);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to save profile");
      }

      setSubmitSuccess(true);
      setEditingSections({
        basic: false,
        education: false,
        skills: false,
        experience: false,
        projects: false,
      });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to save profile",
      );
    } finally {
      setIsSaving(false);
    }
  }, [data]);

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
      <AppHeader user={{ email: data.email, name: data.name }} onLogout={handleLogout} />
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
            onChange={(education) => setData((prev) => prev ? { ...prev, education } : prev)}
            onEdit={() => toggleSection("education")}
          />

          <SkillsCard
            skills={data.skills}
            editing={editingSections.skills}
            onChange={(skills) => setData((prev) => prev ? { ...prev, skills } : prev)}
            onEdit={() => toggleSection("skills")}
          />

          <ExperienceCard
            experience={data.experience}
            editing={editingSections.experience}
            onChange={(experience) => setData((prev) => prev ? { ...prev, experience } : prev)}
            onEdit={() => toggleSection("experience")}
          />

          <ProjectsCard
            projects={data.projects}
            editing={editingSections.projects}
            onChange={(projects) => setData((prev) => prev ? { ...prev, projects } : prev)}
            onEdit={() => toggleSection("projects")}
          />
        </div>

        {submitError && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {submitError}
          </p>
        )}

        {submitSuccess && (
          <p className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            Profile saved successfully.
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
      </div>
    </div>
  );
}
