"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ResumeCard } from "./resume-card";
import { Plus, X } from "lucide-react";

interface SkillsCardProps {
  skills: string[];
  editing: boolean;
  onChange: (skills: string[]) => void;
  onEdit?: () => void;
}

export function SkillsCard({ skills, editing, onChange, onEdit }: SkillsCardProps) {
  const [newSkill, setNewSkill] = useState("");

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      onChange([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    onChange(skills.filter((s) => s !== skill));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  };

  return (
    <ResumeCard title="Skills" editing={editing} onEdit={onEdit}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {skills.length === 0 ? (
            <p className="text-sm text-[#858585]">No skills added yet</p>
          ) : (
            skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#EFECF5] px-3 py-1.5 text-sm text-black"
              >
                {skill}
                {editing && (
                  <button
                    onClick={() => removeSkill(skill)}
                    className="text-[#8E8E8E] hover:text-black"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))
          )}
        </div>
        {editing && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a skill and press Enter"
              className="h-11 flex-1 rounded-lg border border-[#D8D5DD] px-3 text-base text-black outline-none transition focus:border-[#6846E8] focus:ring-2 focus:ring-[#6846E8]/15"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={addSkill}
              className="h-11 rounded-lg border-[#E3DDF0] text-[#5C3BD8] hover:bg-[#F7F1FF]"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </ResumeCard>
  );
}
