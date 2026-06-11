"use client";

import { Button } from "@/components/ui/button";
import { ResumeCard } from "./resume-card";
import { Plus, Trash2 } from "lucide-react";

interface ExperienceEntry {
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface ExperienceCardProps {
  experience: ExperienceEntry[];
  editing: boolean;
  onChange: (experience: ExperienceEntry[]) => void;
  onEdit?: () => void;
}

export function ExperienceCard({
  experience,
  editing,
  onChange,
  onEdit,
}: ExperienceCardProps) {
  const addEntry = () => {
    onChange([
      ...experience,
      {
        title: "",
        company: "",
        startDate: "",
        endDate: "",
        description: "",
      },
    ]);
  };

  const removeEntry = (index: number) => {
    onChange(experience.filter((_, i) => i !== index));
  };

  const updateEntry = (
    index: number,
    field: keyof ExperienceEntry,
    value: string,
  ) => {
    const updated = experience.map((entry, i) =>
      i === index ? { ...entry, [field]: value } : entry,
    );
    onChange(updated);
  };

  return (
    <ResumeCard
      title="Experience"
      editing={editing}
      onEdit={onEdit}
    >
      <div className="space-y-4">
        {experience.length === 0 ? (
          <p className="text-sm text-[#858585]">No experience entries yet</p>
        ) : (
          experience.map((entry, index) => (
            <div
              key={index}
              className={editing ? "relative rounded-xl border border-[#EEEAF4] p-3" : "relative"}
            >
              {editing && (
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-bold text-[#858585]">
                    Experience {index + 1}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEntry(index)}
                    className="size-8 text-[#8EA0B8] hover:bg-red-50 hover:text-red-500"
                    aria-label="Remove experience"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )}
              <div className={editing ? "grid grid-cols-1 gap-3" : "space-y-1"}>
                <div>
                  <label className="sr-only">
                    Job Title
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={entry.title}
                      placeholder="Job title"
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
                    Company
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={entry.company}
                      placeholder="Company"
                      onChange={(e) =>
                        updateEntry(index, "company", e.target.value)
                      }
                      className="h-12 w-full rounded-lg border border-[#D8D5DD] px-3 text-base text-black outline-none transition focus:border-[#6846E8] focus:ring-2 focus:ring-[#6846E8]/15"
                    />
                  ) : (
                    <p className="text-sm text-black">
                      {entry.company || "Not specified"}
                    </p>
                  )}
                </div>
                <div className={editing ? "block" : "hidden"}>
                  <label className="sr-only">
                    Start Date
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={entry.startDate}
                      placeholder="Start date"
                      onChange={(e) =>
                        updateEntry(index, "startDate", e.target.value)
                      }
                      className="h-12 w-full rounded-lg border border-[#D8D5DD] px-3 text-base text-black outline-none transition focus:border-[#6846E8] focus:ring-2 focus:ring-[#6846E8]/15"
                    />
                  ) : (
                    <p className="text-slate-800">
                      {entry.startDate || "Not specified"}
                    </p>
                  )}
                </div>
                <div className={editing ? "block" : "hidden"}>
                  <label className="sr-only">
                    End Date
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={entry.endDate}
                      placeholder="End date"
                      onChange={(e) =>
                        updateEntry(index, "endDate", e.target.value)
                      }
                      className="h-12 w-full rounded-lg border border-[#D8D5DD] px-3 text-base text-black outline-none transition focus:border-[#6846E8] focus:ring-2 focus:ring-[#6846E8]/15"
                    />
                  ) : (
                    <p className="text-slate-800">
                      {entry.endDate || "Present"}
                    </p>
                  )}
                </div>
                {!editing && (
                  <p className="text-sm font-bold text-black">
                    {[entry.startDate, entry.endDate || "Present"].filter(Boolean).join(" — ")}
                  </p>
                )}
                <div>
                  <label className="sr-only">
                    Description
                  </label>
                  {editing ? (
                    <textarea
                      value={entry.description}
                      placeholder="Describe your work"
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
            Add New Experience
          </Button>
        )}
      </div>
    </ResumeCard>
  );
}
