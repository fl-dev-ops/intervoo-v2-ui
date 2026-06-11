"use client";

import { Button } from "@/components/ui/button";
import { ResumeCard } from "./resume-card";
import { Plus, Trash2 } from "lucide-react";

interface ProjectEntry {
  title: string;
  description: string;
}

interface ProjectsCardProps {
  projects: ProjectEntry[];
  editing: boolean;
  onChange: (projects: ProjectEntry[]) => void;
  onEdit?: () => void;
}

export function ProjectsCard({
  projects,
  editing,
  onChange,
  onEdit,
}: ProjectsCardProps) {
  const addEntry = () => {
    onChange([...projects, { title: "", description: "" }]);
  };

  const removeEntry = (index: number) => {
    onChange(projects.filter((_, i) => i !== index));
  };

  const updateEntry = (
    index: number,
    field: keyof ProjectEntry,
    value: string,
  ) => {
    const updated = projects.map((entry, i) =>
      i === index ? { ...entry, [field]: value } : entry,
    );
    onChange(updated);
  };

  return (
    <ResumeCard
      title="Project"
      editing={editing}
      onEdit={onEdit}
    >
      <div className="space-y-4">
        {projects.length === 0 ? (
          <p className="text-sm text-[#858585]">No projects yet</p>
        ) : (
          projects.map((entry, index) => (
            <div
              key={index}
              className={
                editing
                  ? "relative space-y-3 rounded-xl border border-[#EEEAF4] p-3"
                  : "relative space-y-1 border-b border-[#EAE6EE] pb-4 last:border-b-0 last:pb-0"
              }
            >
              {editing && (
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-bold text-[#858585]">
                    Project {index + 1}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEntry(index)}
                    className="size-8 text-[#8EA0B8] hover:bg-red-50 hover:text-red-500"
                    aria-label="Remove project"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <label className="sr-only">
                    Project Title
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={entry.title}
                      placeholder="Project title"
                      onChange={(e) =>
                        updateEntry(index, "title", e.target.value)
                      }
                      className="h-12 w-full rounded-lg border border-[#D8D5DD] px-3 text-base text-black outline-none transition focus:border-[#6846E8] focus:ring-2 focus:ring-[#6846E8]/15"
                    />
                  ) : (
                    <p className="text-base font-bold text-black">
                      {entry.title || "Not specified"}
                    </p>
                  )}
                </div>
                <div>
                  <label className="sr-only">
                    Description
                  </label>
                  {editing ? (
                    <textarea
                      value={entry.description}
                      placeholder="Project description"
                      onChange={(e) =>
                        updateEntry(index, "description", e.target.value)
                      }
                      rows={3}
                      className="min-h-[92px] w-full rounded-lg border border-[#D8D5DD] px-3 py-3 text-base text-black outline-none transition focus:border-[#6846E8] focus:ring-2 focus:ring-[#6846E8]/15"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-5 text-black">
                      {entry.description || "No description"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        {editing && (
          <Button
            variant="outline"
            size="sm"
            onClick={addEntry}
            className="mt-2 rounded-full border-[#E3DDF0] text-[#5C3BD8] hover:bg-[#F7F1FF]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Project
          </Button>
        )}
      </div>
    </ResumeCard>
  );
}
