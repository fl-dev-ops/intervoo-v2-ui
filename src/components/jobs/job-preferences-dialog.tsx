"use client";

import { useRef } from "react";
import { IconX } from "@tabler/icons-react";
import { CheckIcon, LoaderCircle, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@/components/ui/combobox";
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
  setFilters: (
    value: JobProfileFilters | ((prev: JobProfileFilters) => JobProfileFilters),
  ) => void;
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
            <MultiSelectCombobox
              label="Role"
              onChange={(roles) => setFilters((prev) => ({ ...prev, roles }))}
              options={roleOptions}
              placeholder="Select roles"
              selected={filters.roles}
            />
            <MultiSelectCombobox
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
            <MultiSelectCombobox
              label="Skills"
              onChange={(skills) => setFilters((prev) => ({ ...prev, skills }))}
              options={skillOptions}
              placeholder="Select skills"
              selected={filters.skills}
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

export function MultiSelectCombobox({
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
  const visibleOptions = Array.from(
    new Set([...selected, ...options].filter(Boolean)),
  );
  const chipsRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-[#6D6873]">{label}</label>
      <Combobox
        items={visibleOptions}
        multiple
        onValueChange={(value) => onChange(value as string[])}
        value={selected}
      >
        <ComboboxChips ref={chipsRef} className="flex min-h-12 w-full flex-wrap items-center gap-1.5 rounded-lg border border-[#D8D5DD] bg-white px-2.5 py-1.5 text-base shadow-xs transition-colors focus-within:border-[#6846E8] focus-within:ring-2 focus-within:ring-[#6846E8]/15">
          <ComboboxValue>
            {selected.map((value) => (
              <ComboboxChip key={value}>{value}</ComboboxChip>
            ))}
          </ComboboxValue>
          <ComboboxChipsInput
            aria-label={label}
            className="min-w-24 flex-1"
            placeholder={selected.length === 0 ? placeholder : ""}
          />
        </ComboboxChips>
        <ComboboxContent
          anchor={chipsRef}
          align="start"
          className="overflow-hidden rounded-xl border border-[#E3DDF0] p-0 shadow-xl"
          sideOffset={4}
        >
          <div className="flex items-center gap-2 border-b border-[#F1ECF7] px-3 py-2.5">
            <SearchIcon className="size-4 shrink-0 text-[#8A8590]" />
            <ComboboxInput
              className="h-8 flex-1 border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder={`Search ${label.toLowerCase()}...`}
            />
          </div>
          <ComboboxList className="max-h-56 p-1">
            {visibleOptions.length === 0 ? (
              <ComboboxEmpty className="py-3 text-sm text-[#6D6873]">
                No options available yet.
              </ComboboxEmpty>
            ) : (
              visibleOptions.map((option) => (
                <ComboboxItem
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-black data-highlighted:bg-[#F7F1FF] data-highlighted:text-black"
                  key={option}
                  value={option}
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
                </ComboboxItem>
              ))
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
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
  const salaryOptions = ["", "₹6-10 LPA", "₹8-15 LPA", "₹15-25 LPA", "₹25 LPA+"];

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
