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
import { useProfile, useUpdateProfile } from "@/hooks/profile/hooks";

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
  const profileQuery = useProfile({ enabled: open });
  const saveMutation = useUpdateProfile();
  const [data, setData] = useState<ProfileData | null>(null);
  const [editingSections, setEditingSections] =
    useState<Record<EditableSection, boolean>>(EDITING_SECTIONS);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState("");

  const isLoading = profileQuery.isFetching;
  const isSaving = saveMutation.isPending;

  // Reset the draft's editing UI each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setSubmitError("");
    setErrors({});
    setEditingSections(EDITING_SECTIONS);
  }, [open]);

  // Seed the editable draft from the loaded profile.
  useEffect(() => {
    const payload = profileQuery.data;
    if (!payload) return;
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
  }, [profileQuery.data]);

  useEffect(() => {
    if (profileQuery.error instanceof Error) {
      setSubmitError(profileQuery.error.message);
    }
  }, [profileQuery.error]);

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

    setSubmitError("");
    try {
      await saveMutation.mutateAsync(data);
      onOpenChange(false);
      onSaved();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save profile",
      );
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
