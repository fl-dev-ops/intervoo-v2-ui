"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";

type ParsedResumeData = {
  name: string;
  email: string;
  phoneNumber: string;
  education: {
    degree: string;
    stream: string;
    institution: string;
    graduationYear: string;
    score: string;
  }[];
  skills: string[];
  experience: {
    title: string;
    company: string;
    startDate: string;
    endDate: string;
    description: string;
  }[];
  projects: { title: string; description: string }[];
};

type ResumeParsingSkeletonProps = {
  email: string;
  loadedSections: (
    "basic" | "education" | "skills" | "experience" | "projects"
  )[];
  name: string;
  phoneNumber: string;
  resumeData: ParsedResumeData | null;
};

export function ResumeParsingSkeleton({
  email,
  loadedSections,
  name,
  phoneNumber,
  resumeData,
}: ResumeParsingSkeletonProps) {
  return (
    <div className="mx-auto w-full max-w-[620px] px-4 pb-14 pt-8 md:pt-10">
      <h1 className="mx-auto max-w-[520px] text-center font-serif text-2xl font-semibold leading-tight text-black">
        Getting your profile ready...
      </h1>

      <div className="mt-8 space-y-4">
        <LoadingCard title="Basic Information">
          {resumeData && loadedSections.includes("basic") ? (
            <RevealedContent>
              <div className="space-y-3">
                <ResumeValue
                  className="font-bold"
                  value={getDisplayName(resumeData.name)}
                />
                <ResumeValue value={resumeData.email} />
                <ResumeValue value={resumeData.phoneNumber} />
              </div>
            </RevealedContent>
          ) : (
            <div className="space-y-3">
              <BasicInformationValue
                className="font-bold"
                value={getDisplayName(name)}
              />
              <BasicInformationValue value={email} />
              <BasicInformationValue value={phoneNumber} />
            </div>
          )}
        </LoadingCard>

        <LoadingCard title="Educational Background">
          {resumeData && loadedSections.includes("education") ? (
            <RevealedContent>
              <EducationContent education={resumeData.education} />
            </RevealedContent>
          ) : (
            <LoadingTextLines />
          )}
        </LoadingCard>

        <LoadingCard title="Skills">
          {resumeData && loadedSections.includes("skills") ? (
            <RevealedContent>
              <SkillsContent skills={resumeData.skills} />
            </RevealedContent>
          ) : (
            <LoadingSkills />
          )}
        </LoadingCard>

        <LoadingCard title="Experience">
          {resumeData && loadedSections.includes("experience") ? (
            <RevealedContent>
              <ExperienceContent experience={resumeData.experience} />
            </RevealedContent>
          ) : (
            <LoadingTextLines />
          )}
        </LoadingCard>

        <LoadingCard title="Projects">
          {resumeData && loadedSections.includes("projects") ? (
            <RevealedContent>
              <ProjectsContent projects={resumeData.projects} />
            </RevealedContent>
          ) : (
            <LoadingTextLines />
          )}
        </LoadingCard>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <button
          className="inline-flex h-12 min-w-36 items-center justify-center gap-2 rounded-full bg-white/60 px-5 text-base font-bold text-[#5A5562] opacity-60"
          disabled
          type="button"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
        <button
          className="inline-flex h-12 min-w-36 items-center justify-center gap-2 rounded-full bg-[#C8C2D8] px-5 text-base font-bold text-white opacity-70"
          disabled
          type="button"
        >
          Next
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

function RevealedContent({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}

function ResumeValue({
  className = "",
  value,
}: {
  className?: string;
  value: string;
}) {
  return (
    <p className={`text-base text-black ${className}`}>
      {value.trim() || "Not specified"}
    </p>
  );
}

function EducationContent({
  education,
}: {
  education: ParsedResumeData["education"];
}) {
  if (education.length === 0) return <EmptyValue />;

  return (
    <div className="space-y-4">
      {education.map((entry, index) => {
        const qualification = [entry.degree, entry.stream]
          .filter(Boolean)
          .join(" · ");
        const details = [entry.institution, entry.graduationYear, entry.score]
          .filter(Boolean)
          .join(" · ");

        return (
          <div key={`${entry.institution}-${entry.degree}-${index}`}>
            <ResumeValue className="font-semibold" value={qualification} />
            {details ? (
              <p className="mt-1 text-sm text-[#696472]">{details}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function SkillsContent({ skills }: { skills: string[] }) {
  if (skills.length === 0) return <EmptyValue />;

  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => (
        <span
          className="rounded-full bg-[#F3F0FA] px-3 py-1.5 text-sm font-medium text-[#4F397D]"
          key={skill}
        >
          {skill}
        </span>
      ))}
    </div>
  );
}

function ExperienceContent({
  experience,
}: {
  experience: ParsedResumeData["experience"];
}) {
  if (experience.length === 0) return <EmptyValue />;

  return (
    <div className="space-y-4">
      {experience.map((entry, index) => {
        const heading = [entry.title, entry.company]
          .filter(Boolean)
          .join(" · ");
        const dates = [entry.startDate, entry.endDate]
          .filter(Boolean)
          .join(" – ");

        return (
          <div key={`${entry.company}-${entry.title}-${index}`}>
            <ResumeValue className="font-semibold" value={heading} />
            {dates ? (
              <p className="mt-1 text-sm text-[#696472]">{dates}</p>
            ) : null}
            {entry.description ? (
              <p className="mt-2 text-sm leading-relaxed text-[#696472]">
                {entry.description}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ProjectsContent({
  projects,
}: {
  projects: ParsedResumeData["projects"];
}) {
  if (projects.length === 0) return <EmptyValue />;

  return (
    <div className="space-y-4">
      {projects.map((project, index) => (
        <div key={`${project.title}-${index}`}>
          <ResumeValue className="font-semibold" value={project.title} />
          {project.description ? (
            <p className="mt-2 text-sm leading-relaxed text-[#696472]">
              {project.description}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function EmptyValue() {
  return <p className="text-sm text-[#85808B]">Not specified</p>;
}

function LoadingTextLines() {
  return (
    <div className="space-y-3">
      <LoadingLine className="w-full" />
      <LoadingLine className="w-2/3" />
    </div>
  );
}

function LoadingSkills() {
  return (
    <div className="flex flex-wrap gap-4">
      {[
        "skill-one",
        "skill-two",
        "skill-three",
        "skill-four",
        "skill-five",
      ].map((id) => (
        <LoadingLine key={id} className="h-4 w-20" />
      ))}
    </div>
  );
}

function LoadingCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-[22px] border border-[#E5E1E8] bg-white px-6 py-6 shadow-[0_14px_36px_rgba(58,37,109,0.04)]">
      <h2 className="mb-5 text-sm font-bold uppercase text-[#858585]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function BasicInformationValue({
  className = "",
  value,
}: {
  className?: string;
  value: string;
}) {
  if (!value.trim()) return <LoadingLine className="w-1/2" />;
  return <p className={`text-base text-black ${className}`}>{value}</p>;
}

function getDisplayName(name: string) {
  const value = name.trim();
  if (/^[+\d\s()-]+$/.test(value)) return "";
  return value;
}

function LoadingLine({ className }: { className: string }) {
  return (
    <div
      aria-hidden
      className={`h-3 animate-pulse rounded-full bg-[linear-gradient(90deg,#E8EEEC_0%,#8CEBC9_20%,#FFE4B4_58%,#E9E7F3_100%)] ${className}`}
    />
  );
}
