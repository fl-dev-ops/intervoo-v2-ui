"use client";

import { Button } from "@/components/ui/button";
import { ResumeCard } from "./resume-card";
import { Plus, Trash2 } from "lucide-react";

interface EducationEntry {
  degree: string;
  stream: string;
  institution: string;
  graduationYear: string;
  score: string;
}

interface EducationCardProps {
  education: EducationEntry[];
  editing: boolean;
  onChange: (education: EducationEntry[]) => void;
  onEdit?: () => void;
}

export function EducationCard({
  education,
  editing,
  onChange,
  onEdit,
}: EducationCardProps) {
  const addEntry = () => {
    onChange([
      ...education,
      {
        degree: "",
        stream: "",
        institution: "",
        graduationYear: "",
        score: "",
      },
    ]);
  };

  const removeEntry = (index: number) => {
    onChange(education.filter((_, i) => i !== index));
  };

  const updateEntry = (
    index: number,
    field: keyof EducationEntry,
    value: string,
  ) => {
    const updated = education.map((entry, i) =>
      i === index ? { ...entry, [field]: value } : entry,
    );
    onChange(updated);
  };

  const updateEducationTitle = (index: number, value: string) => {
    const updated = education.map((entry, i) =>
      i === index ? { ...entry, degree: value, stream: "" } : entry,
    );
    onChange(updated);
  };

  return (
    <ResumeCard title="Educational Background" editing={editing} onEdit={onEdit}>
      <div className="space-y-4">
        {education.length === 0 ? (
          <p className="text-sm text-[#858585]">No education entries yet</p>
        ) : (
          education.map((entry, index) => (
            <div
              key={index}
              className={editing ? "relative rounded-xl border border-[#EEEAF4] p-3" : "relative"}
            >
              {editing && (
                <div className="mb-2 flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEntry(index)}
                    className="size-8 text-[#8EA0B8] hover:bg-red-50 hover:text-red-500"
                    aria-label="Remove education"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )}
              <div className={editing ? "grid grid-cols-1 gap-3" : "space-y-1"}>
                <div>
                  <label className="sr-only">
                    Degree
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formatEducationTitle(entry)}
                      placeholder="Degree, stream"
                      onChange={(e) => updateEducationTitle(index, e.target.value)}
                      className="h-12 w-full rounded-lg border border-[#D8D5DD] px-3 text-base text-black outline-none transition focus:border-[#6846E8] focus:ring-2 focus:ring-[#6846E8]/15"
                    />
                  ) : (
                    <p className="text-base font-bold text-black">
                      {[entry.degree, entry.stream].filter(Boolean).join(", ") ||
                        "Not specified"}
                    </p>
                  )}
                </div>
                <div>
                  <label className="sr-only">
                    Institution
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={entry.institution}
                      placeholder="Institution"
                      onChange={(e) =>
                        updateEntry(index, "institution", e.target.value)
                      }
                      className="h-12 w-full rounded-lg border border-[#D8D5DD] px-3 text-base text-black outline-none transition focus:border-[#6846E8] focus:ring-2 focus:ring-[#6846E8]/15"
                    />
                  ) : (
                    <p className="text-sm text-black">
                      {[entry.institution, entry.graduationYear, entry.score]
                        .filter(Boolean)
                        .join(" | ") || "Not specified"}
                    </p>
                  )}
                </div>
                <div className={editing ? "block" : "hidden"}>
                  <label className="sr-only">
                    Graduation Year
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={entry.graduationYear}
                      placeholder="Graduation year"
                      onChange={(e) =>
                        updateEntry(index, "graduationYear", e.target.value)
                      }
                      className="h-12 w-full rounded-lg border border-[#D8D5DD] px-3 text-base text-black outline-none transition focus:border-[#6846E8] focus:ring-2 focus:ring-[#6846E8]/15"
                    />
                  ) : (
                    <p className="text-slate-800">
                      {entry.graduationYear || "Not specified"}
                    </p>
                  )}
                </div>
                <div className={editing ? "block" : "hidden"}>
                  <label className="sr-only">
                    Score/GPA
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={entry.score}
                      placeholder="Score / GPA"
                      onChange={(e) =>
                        updateEntry(index, "score", e.target.value)
                      }
                      className="h-12 w-full rounded-lg border border-[#D8D5DD] px-3 text-base text-black outline-none transition focus:border-[#6846E8] focus:ring-2 focus:ring-[#6846E8]/15"
                    />
                  ) : (
                    <p className="text-slate-800">{entry.score || "Not specified"}</p>
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
            Add Education
          </Button>
        )}
      </div>
    </ResumeCard>
  );
}

function formatEducationTitle(entry: EducationEntry) {
  return [entry.degree, entry.stream].filter(Boolean).join(", ");
}
