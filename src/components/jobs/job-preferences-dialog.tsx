"use client";

import { useState } from "react";
import { IconChevronDown, IconX } from "@tabler/icons-react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type JobProfileFilters = {
  companies: string[];
  roles: string[];
  salary: string;
  skills: string[];
};

type JobPreferencesDialogProps = {
  companyOptions: string[];
  filters: JobProfileFilters;
  isLoading: boolean;
  onApply: () => void;
  onClose: () => void;
  roleOptions: string[];
  setFilters: (value: JobProfileFilters | ((prev: JobProfileFilters) => JobProfileFilters)) => void;
  skillOptions: string[];
};

export function JobPreferencesDialog({
  companyOptions,
  filters,
  isLoading,
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
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full bg-white text-black shadow-sm"
            aria-label="Close filters"
          >
            <IconX className="size-5" />
          </button>
        </div>

        <div className="mt-6 rounded-[22px] border border-[#E4DDEC] bg-white p-6 shadow-[0_24px_70px_rgba(58,37,109,0.08)]">
          <p className="text-sm font-extrabold uppercase tracking-wide text-black">
            Job Preference
          </p>
          <div className="mt-6 space-y-4">
            <MultiDropdown
              label="Role"
              options={roleOptions}
              placeholder="Select roles"
              selected={filters.roles}
              onChange={(roles) => setFilters((prev) => ({ ...prev, roles }))}
            />
            <MultiDropdown
              label="Company"
              options={companyOptions}
              placeholder="Select companies"
              selected={filters.companies}
              onChange={(companies) =>
                setFilters((prev) => ({ ...prev, companies }))
              }
            />
            <SalarySection
              salary={filters.salary}
              setSalary={(salary) => setFilters((prev) => ({ ...prev, salary }))}
            />
            <MultiDropdown
              label="Skills"
              options={skillOptions}
              placeholder="Select skills"
              selected={filters.skills}
              onChange={(skills) => setFilters((prev) => ({ ...prev, skills }))}
            />
          </div>
        </div>

        <div className="sticky bottom-0 mt-auto grid grid-cols-[1fr_1.35fr] gap-4 bg-[#F7F1FF] py-6">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="h-12 rounded-full bg-white/70 text-base font-bold text-[#5A5562]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onApply}
            disabled={isLoading}
            className="h-12 rounded-full bg-gradient-to-r from-[#5436B8] to-[#7149F6] text-base font-bold text-white"
          >
            {isLoading ? (
              <>
                <LoaderCircle className="mr-2 size-4 animate-spin" />
                Applying
              </>
            ) : (
              "Check job match"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MultiDropdown({
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
  const [search, setSearch] = useState("");
  const visibleOptions = [...new Set([...selected, ...options])].filter(Boolean);
  const filtered = visibleOptions.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase()),
  );
  const summary = selected.length ? selected.join(", ") : placeholder;

  function toggle(option: string) {
    onChange(
      selected.includes(option)
        ? selected.filter((item) => item !== option)
        : [...selected, option],
    );
  }

  return (
    <section>
      <label className="text-sm text-[#6D6873]">
        {label}
      </label>
      <Popover>
        <PopoverTrigger
          className="mt-1 flex h-12 w-full items-center justify-between rounded-lg border border-[#D8D5DD] bg-white px-3 text-left text-base text-black outline-none transition focus:border-[#6846E8] focus:ring-2 focus:ring-[#6846E8]/15"
        >
          <span className={cn("truncate", !selected.length && "text-[#8A8590]")}>{summary}</span>
          <IconChevronDown className="size-5 shrink-0 text-[#6D6873]" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-[var(--trigger-width)] max-h-64 overflow-hidden rounded-xl border border-[#E3DDF0] p-0 shadow-xl"
        >
          <Command shouldFilter={false}>
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder="Search..."
            />
            <CommandList>
              <CommandEmpty className="py-2 text-sm text-[#6D6873]">
                No options available yet.
              </CommandEmpty>
              <CommandGroup className="max-h-48 overflow-y-auto">
                {filtered.map((option) => {
                  const isSelected = selected.includes(option);
                  return (
                    <CommandItem
                      key={option}
                      onSelect={() => toggle(option)}
                      className="cursor-pointer"
                    >
                      <Checkbox
                        checked={isSelected}
                        tabIndex={-1}
                      />
                      <span className="min-w-0 truncate">{option}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </section>
  );
}

function SalarySection({
  salary,
  setSalary,
}: {
  salary: string;
  setSalary: (value: string) => void;
}) {
  const salaryOptions = ["", "₹6-10 LPA", "₹8-15 LPA", "₹15-25 LPA", "₹25 LPA+"];

  return (
    <section>
      <label className="text-sm text-[#6D6873]">
        Salary
      </label>
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
