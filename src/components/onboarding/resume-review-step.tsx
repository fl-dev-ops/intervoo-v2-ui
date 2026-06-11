"use client";

import { useState } from "react";
import { IconDeviceFloppyFilled } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { BasicInfoCard } from "./basic-info-card";
import { EducationCard } from "./education-card";
import { SkillsCard } from "./skills-card";
import { ExperienceCard } from "./experience-card";
import { ProjectsCard } from "./projects-card";
import { ArrowLeft, Loader2 } from "lucide-react";

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

interface ResumeData {
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

interface ResumeReviewStepProps {
  initialData: ResumeData;
  onComplete: (data: ResumeData) => Promise<void>;
  onBack: () => void;
  isCompleting: boolean;
}

type EditableSection = "basic" | "education" | "skills" | "experience" | "projects";
type ValidationErrors = Partial<Record<"name" | "email" | "phoneNumber", string>>;

export function ResumeReviewStep({
  initialData,
  onComplete,
  onBack,
  isCompleting,
}: ResumeReviewStepProps) {
  const [data, setData] = useState<ResumeData>(initialData);
  const [editingSections, setEditingSections] = useState<Record<EditableSection, boolean>>({
    basic: false,
    education: false,
    skills: false,
    experience: false,
    projects: false,
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState("");

  const toggleSection = (section: EditableSection) => {
    setEditingSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleBasicInfoChange = (field: string, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSubmitError("");
  };

  const handleEducationChange = (education: EducationEntry[]) => {
    setData((prev) => ({ ...prev, education }));
  };

  const handleSkillsChange = (skills: string[]) => {
    setData((prev) => ({ ...prev, skills }));
  };

  const handleExperienceChange = (experience: ExperienceEntry[]) => {
    setData((prev) => ({ ...prev, experience }));
  };

  const handleProjectsChange = (projects: ProjectEntry[]) => {
    setData((prev) => ({ ...prev, projects }));
  };

  const handleSubmit = async () => {
    const validationErrors = validateResumeData(data);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setEditingSections((prev) => ({ ...prev, basic: true }));
      setSubmitError("Please fix the highlighted fields before saving.");
      return;
    }

    setSubmitError("");
    await onComplete(data);
  };

  return (
    <div className="mx-auto w-full max-w-[560px] px-4 pb-14 pt-8 md:pt-10">
      <div className="mb-7 text-center">
        <h2 className="text-lg font-extrabold tracking-tight text-black">
          Here's what we read from your resume.
        </h2>
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
          onChange={handleEducationChange}
          onEdit={() => toggleSection("education")}
        />

        <SkillsCard
          skills={data.skills}
          editing={editingSections.skills}
          onChange={handleSkillsChange}
          onEdit={() => toggleSection("skills")}
        />

        <ExperienceCard
          experience={data.experience}
          editing={editingSections.experience}
          onChange={handleExperienceChange}
          onEdit={() => toggleSection("experience")}
        />

        <ProjectsCard
          projects={data.projects}
          editing={editingSections.projects}
          onChange={handleProjectsChange}
          onEdit={() => toggleSection("projects")}
        />
      </div>

      {submitError && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {submitError}
        </p>
      )}

      <div className="mt-6 grid grid-cols-[1fr_1.35fr] gap-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="h-[54px] rounded-full bg-white/60 text-base font-bold text-[#5A5562] hover:bg-white"
        >
          <ArrowLeft className="mr-2 size-4" />
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isCompleting}
          className="h-[54px] rounded-full bg-gradient-to-r from-[#5436B8] to-[#7149F6] text-base font-bold text-white shadow-none hover:from-[#4B2EAA] hover:to-[#6846E8]"
        >
          {isCompleting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Completing...
            </>
          ) : (
            <>
              <IconDeviceFloppyFilled className="mr-2 size-4" />
              Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function validateResumeData(data: ResumeData): ValidationErrors {
  const errors: ValidationErrors = {};
  const email = data.email.trim();
  const phoneNumber = data.phoneNumber.trim();

  if (!data.name.trim()) errors.name = "Name is required";
  if (!email) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address";
  }
  if (!phoneNumber) {
    errors.phoneNumber = "Phone number is required";
  } else if (!/^[+\d][\d\s()-]{7,}$/.test(phoneNumber)) {
    errors.phoneNumber = "Enter a valid phone number";
  }

  return errors;
}
