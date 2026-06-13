"use client";

import { useEffect, useRef, useState } from "react";
import { IconX } from "@tabler/icons-react";
import { CheckIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type JobProfileFilters = {
  companies: string[];
  roles: string[];
  salary: string;
  skills: string[];
};

type JobPreferencesDialogProps = {
  canClose?: boolean;
  companyOptions: string[];
  filters: JobProfileFilters;
  onApply: () => void;
  onClose: () => void;
  roleOptions: string[];
  setFilters: (
    value: JobProfileFilters | ((prev: JobProfileFilters) => JobProfileFilters),
  ) => void;
  skillOptions: string[];
};

export function JobPreferencesDialog({
  canClose = true,
  companyOptions,
  filters,
  onApply,
  onClose,
  roleOptions,
  setFilters,
  skillOptions,
}: JobPreferencesDialogProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F7F1FF] px-4 py-6">
      <div className="mx-auto flex min-h-full w-full max-w-[600px] flex-col">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#827B89]">
              Job preferences
            </p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight">
              Your job preferences
            </h2>
          </div>
          {canClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex size-10 items-center justify-center rounded-full bg-white text-black shadow-sm"
              aria-label="Close filters"
            >
              <IconX className="size-5" />
            </button>
          )}
        </div>

        <div className="mt-6 rounded-[22px] border border-[#E4DDEC] bg-white p-6 shadow-[0_24px_70px_rgba(58,37,109,0.08)]">
          <p className="text-sm font-extrabold uppercase tracking-wide text-black">
            Job Preference
          </p>
          <div className="mt-6 space-y-4">
            <MultiSelectField
              label="Role"
              onChange={(roles) => setFilters((prev) => ({ ...prev, roles }))}
              options={roleOptions}
              placeholder="Select roles"
              selected={filters.roles}
            />
            <MultiSelectField
              label="Company"
              onChange={(companies) =>
                setFilters((prev) => ({ ...prev, companies }))
              }
              options={companyOptions}
              placeholder="Select companies"
              selected={filters.companies}
            />
            <SalarySection
              salary={filters.salary}
              setSalary={(salary) =>
                setFilters((prev) => ({ ...prev, salary }))
              }
            />
            <MultiSelectField
              label="Skills"
              onChange={(skills) => setFilters((prev) => ({ ...prev, skills }))}
              options={skillOptions}
              placeholder="Select skills"
              selected={filters.skills}
            />
          </div>
        </div>

        <div className={cn("mt-auto gap-4 bg-[#F7F1FF] py-6", canClose ? "grid grid-cols-[1fr_1.35fr]" : "flex justify-end")}>
          {canClose && (
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="h-12 rounded-full bg-white/70 text-base font-bold text-[#5A5562]"
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            onClick={onApply}
            className="h-12 w-full max-w-[50%] rounded-full bg-gradient-to-r from-[#5436B8] to-[#7149F6] text-base font-bold text-white"
          >
            Save preference
          </Button>
        </div>
      </div>
    </div>
  );
}

function MultiSelectField({
  label,
  onChange,
  options,
  placeholder,
  selected,
}: {
  label: string;
  onChange: (value: string[]) => void;
  options: string[];
  placeholder: string;
  selected: string[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleOptions = Array.from(
    new Set([...selected, ...options].filter(Boolean)),
  );
  const filtered = visibleOptions.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  function toggle(option: string) {
    onChange(
      selected.includes(option)
        ? selected.filter((v) => v !== option)
        : [...selected, option],
    );
  }

  function remove(option: string) {
    onChange(selected.filter((v) => v !== option));
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5">
      <label className="text-sm text-[#6D6873]">{label}</label>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
          setSearch("");
        }}
        className={cn(
          "flex min-h-12 w-full flex-wrap items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1.5 text-left text-base transition-colors",
          open ? "border-[#6846E8]" : "border-[#D8D5DD]",
        )}
      >
        {selected.length === 0 ? (
          <span className="text-[#8A8590]">{placeholder}</span>
        ) : (
          selected.map((value) => (
            <span
              key={value}
              className="flex h-7 items-center gap-1 rounded-sm bg-[#F7F1FF] px-2 text-xs font-medium text-[#3A256D]"
            >
              <span className="max-w-[160px] truncate">{value}</span>
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  remove(value);
                }}
                className="flex size-3.5 shrink-0 cursor-pointer items-center justify-center rounded-sm text-[#8A8590] hover:bg-[#E8E0F5] hover:text-[#5C3BD8]"
              >
                <IconX className="size-3" />
              </span>
            </span>
          ))
        )}
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-[#E3DDF0] bg-white">
          <div className="flex items-center gap-2 border-b border-[#F1ECF7] px-3 py-2.5">
            <SearchIcon className="size-4 shrink-0 text-[#8A8590]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 flex-1 border-none bg-transparent p-0 text-sm text-black outline-none placeholder:text-[#8A8590]"
              placeholder={`Search ${label.toLowerCase()}...`}
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="py-3 text-center text-sm text-[#6D6873]">
                No options available yet.
              </p>
            ) : (
              filtered.map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => toggle(option)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-black hover:bg-[#F7F1FF]"
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded border",
                      selected.includes(option)
                        ? "border-[#5C3BD8] bg-[#5C3BD8] text-white"
                        : "border-[#D8D5DD] bg-white",
                    )}
                  >
                    {selected.includes(option) ? (
                      <CheckIcon className="size-3" />
                    ) : null}
                  </span>
                  <span className="min-w-0 truncate">{option}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SalarySection({
  salary,
  setSalary,
}: {
  salary: string;
  setSalary: (value: string) => void;
}) {
  const salaryOptions = [
    "",
    "₹6-10 LPA",
    "₹8-15 LPA",
    "₹15-25 LPA",
    "₹25 LPA+",
  ];

  return (
    <section>
      <label className="text-sm text-[#6D6873]">Salary</label>
      <select
        value={salary}
        onChange={(event) => setSalary(event.target.value)}
        className="mt-1 h-12 w-full rounded-lg border border-[#D8D5DD] bg-white px-3 text-base text-black outline-none transition focus:border-[#6846E8] focus:ring-2 focus:ring-[#6846E8]/15"
      >
        {salaryOptions.map((option) => (
          <option key={option || "any"} value={option}>
            {option || "Any salary"}
          </option>
        ))}
      </select>
    </section>
  );
}
