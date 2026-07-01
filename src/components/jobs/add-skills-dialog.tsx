"use client";

import { AlertCircle, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AddSkillsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobSkills: string[];
  onSaved: () => void;
};

type ProfileData = {
  name: string;
  email: string;
  resume: {
    role: string;
    experienceYears: number | null;
    education: unknown[];
    skills: string[];
    experience: unknown[];
    projects: unknown[];
  } | null;
};

function normalizeSkill(skill: string): string {
  return skill.trim().toLowerCase();
}

function skillExists(list: string[], skill: string): boolean {
  const normalized = normalizeSkill(skill);
  return list.some((s) => normalizeSkill(s) === normalized);
}

function removeSkillByValue(list: string[], skill: string): string[] {
  const normalized = normalizeSkill(skill);
  return list.filter((s) => normalizeSkill(s) !== normalized);
}

export function AddSkillsDialog({
  open,
  onOpenChange,
  jobSkills,
  onSaved,
}: AddSkillsDialogProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setError(null);
    setNewSkill("");

    async function fetchProfile() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        if (!response.ok) {
          setError("Failed to load your profile. Please try again.");
          return;
        }
        const data = (await response.json()) as ProfileData;
        setProfile(data);
        setSelectedSkills(data.resume?.skills ?? []);
      } catch {
        setError("Failed to load your profile. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    void fetchProfile();
  }, [open]);

  const addJobSkill = (skill: string) => {
    if (!skillExists(selectedSkills, skill)) {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const removeSkill = (skill: string) => {
    setSelectedSkills(removeSkillByValue(selectedSkills, skill));
  };

  const addCustomSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !skillExists(selectedSkills, trimmed)) {
      setSelectedSkills([...selectedSkills, trimmed]);
      setNewSkill("");
      setError(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomSkill();
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          role: profile.resume?.role ?? "",
          experienceYears: profile.resume?.experienceYears ?? null,
          education: profile.resume?.education ?? [],
          skills: selectedSkills,
          experience: profile.resume?.experience ?? [],
          projects: profile.resume?.projects ?? [],
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Failed to save skills");
      }

      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save skills");
    } finally {
      setIsSaving(false);
    }
  };

  const jobSkillsNotSelected = jobSkills.filter(
    (skill) => !skillExists(selectedSkills, skill),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add skills</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-[#6D6873]">Skills</p>
            <div className="flex flex-wrap gap-2">
              {isLoading ? (
                <p className="text-sm text-[#6D6873]">Loading...</p>
              ) : selectedSkills.length === 0 &&
                jobSkillsNotSelected.length === 0 ? (
                <p className="text-sm text-[#6D6873]">No skills found</p>
              ) : (
                <>
                  {selectedSkills.map((skill) => (
                    <span
                      key={normalizeSkill(skill)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFF8E8] px-3 py-1.5 text-sm font-medium text-black"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        aria-label={`Remove ${skill}`}
                        className="inline-flex size-3.5 items-center justify-center rounded-full bg-[#6D6D6D] text-white hover:bg-[#555555] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#5C3BD8]"
                      >
                        <X className="size-2" strokeWidth={3} />
                      </button>
                    </span>
                  ))}
                  {jobSkillsNotSelected.map((skill) => (
                    <span
                      key={normalizeSkill(skill)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#F3F0F4] px-3 py-1.5 text-sm font-medium text-black"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => addJobSkill(skill)}
                        className="text-[#5C3BD8] hover:text-[#4F33A3]"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type and add skills"
              className="h-11 flex-1 rounded-lg border border-[#D8D5DD] px-3 text-sm text-black outline-none transition focus:border-[#6846E8] focus:ring-2 focus:ring-[#6846E8]/15"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={addCustomSkill}
              className="h-11 rounded-lg border-[#E3DDF0] text-[#5C3BD8] hover:bg-[#F7F1FF]"
            >
              Add skill
            </Button>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {error}
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-lg bg-[#FFF8E8] px-3 py-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D96A00]" />
              <p className="text-xs text-[#6D6873]">
                These skills will be added to your profile directly
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className={"px-4"}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="bg-[linear-gradient(90deg,#5B37C8_0%,#6D47F4_100%)] px-4"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
