"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  BasicInfoCard,
  EducationCard,
  ExperienceCard,
  ProjectsCard,
  SkillsCard,
} from "@/components/onboarding";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

type EducationEntry = {
  degree: string;
  stream: string;
  institution: string;
  graduationYear: string;
  score: string;
};

type ExperienceEntry = {
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  description: string;
};

type ProjectEntry = {
  title: string;
  description: string;
};

type ProfileData = {
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  experienceYears: number | null;
  education: EducationEntry[];
  skills: string[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
};

type EditableSection =
  | "basic"
  | "education"
  | "skills"
  | "experience"
  | "projects";

type ValidationErrors = Partial<
  Record<"name" | "email" | "phoneNumber", string>
>;

type ProfileEditDialogProps = {
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  open: boolean;
};

const EDITING_SECTIONS: Record<EditableSection, boolean> = {
  basic: true,
  education: true,
  skills: true,
  experience: true,
  projects: true,
};

export function ProfileEditDialog({
  onOpenChange,
  onSaved,
  open,
}: ProfileEditDialogProps) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [editingSections, setEditingSections] =
    useState<Record<EditableSection, boolean>>(EDITING_SECTIONS);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setIsLoading(true);
    setData(null);
    setSubmitError("");
    setErrors({});
    setEditingSections(EDITING_SECTIONS);

    async function loadProfile() {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load profile");
        }
        if (cancelled) return;

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
      } catch (error) {
        if (!cancelled) {
          setSubmitError(
            error instanceof Error ? error.message : "Failed to load profile",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [open]);

  function toggleSection(section: EditableSection) {
    setEditingSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  function updateBasicInfo(field: string, value: string) {
    setData((current) => (current ? { ...current, [field]: value } : current));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError("");
  }

  async function saveProfile() {
    if (!data) return;

    const validationErrors = validateProfile(data);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setEditingSections((current) => ({ ...current, basic: true }));
      setSubmitError("Please fix the highlighted fields before saving.");
      return;
    }

    setIsSaving(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save profile");
      }

      onOpenChange(false);
      onSaved();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save profile",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] gap-5 overflow-hidden rounded-2xl p-0 sm:max-w-xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-base font-extrabold uppercase tracking-wide text-black">
            Profile
          </DialogTitle>
          <DialogDescription className="sr-only">
            Review and update your profile information.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto px-6 pb-6">
          {isLoading ? (
            <div className="flex min-h-64 items-center justify-center">
              <Spinner className="size-8" />
            </div>
          ) : data ? (
            <div className="space-y-4">
              <BasicInfoCard
                editing={editingSections.basic}
                email={data.email}
                errors={errors}
                name={data.name}
                onChange={updateBasicInfo}
                onEdit={() => toggleSection("basic")}
                phoneNumber={data.phoneNumber}
              />
              <EducationCard
                editing={editingSections.education}
                education={data.education}
                onChange={(education) =>
                  setData((current) =>
                    current ? { ...current, education } : current,
                  )
                }
                onEdit={() => toggleSection("education")}
              />
              <SkillsCard
                editing={editingSections.skills}
                onChange={(skills) =>
                  setData((current) =>
                    current ? { ...current, skills } : current,
                  )
                }
                onEdit={() => toggleSection("skills")}
                skills={data.skills}
              />
              <ExperienceCard
                editing={editingSections.experience}
                experience={data.experience}
                onChange={(experience) =>
                  setData((current) =>
                    current ? { ...current, experience } : current,
                  )
                }
                onEdit={() => toggleSection("experience")}
              />
              <ProjectsCard
                editing={editingSections.projects}
                onChange={(projects) =>
                  setData((current) =>
                    current ? { ...current, projects } : current,
                  )
                }
                onEdit={() => toggleSection("projects")}
                projects={data.projects}
              />

              {submitError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {submitError}
                </p>
              ) : null}

              <Button
                className="w-full"
                disabled={isSaving}
                onClick={() => void saveProfile()}
                size="lg"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save profile"
                )}
              </Button>
            </div>
          ) : (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {submitError || "Profile could not be loaded."}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function validateProfile(data: ProfileData): ValidationErrors {
  const validationErrors: ValidationErrors = {};
  const email = data.email.trim();
  const phoneNumber = data.phoneNumber.trim();

  if (!data.name.trim()) validationErrors.name = "Name is required";
  if (!email) {
    validationErrors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    validationErrors.email = "Enter a valid email address";
  }
  if (!phoneNumber) {
    validationErrors.phoneNumber = "Phone number is required";
  } else if (!/^[+\d][\d\s()-]{7,}$/.test(phoneNumber)) {
    validationErrors.phoneNumber = "Enter a valid phone number";
  }

  return validationErrors;
}
