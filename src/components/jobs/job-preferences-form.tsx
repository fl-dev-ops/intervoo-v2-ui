"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MultiCombobox } from "@/components/ui/multi-combobox";
import type { JobProfileFilters } from "@/lib/job-profile-filters";

export type { JobProfileFilters } from "@/lib/job-profile-filters";

type JobPreferencesFormProps = {
  companyOptions: string[];
  filters: JobProfileFilters;
  isApplying?: boolean;
  isLoadingCompanyOptions?: boolean;
  onApply: () => void;
  roleOptions: string[];
  setFilters: (
    value: JobProfileFilters | ((prev: JobProfileFilters) => JobProfileFilters),
  ) => void;
};

export function JobPreferencesForm({
  companyOptions,
  filters,
  isApplying = false,
  isLoadingCompanyOptions = false,
  onApply,
  roleOptions,
  setFilters,
}: JobPreferencesFormProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <MultiCombobox
          closeOnValueChange
          label="Role"
          onValueChange={(roles) =>
            setFilters((current) => ({ ...current, roles }))
          }
          options={roleOptions}
          placeholder="Search role..."
          value={filters.roles}
        />
        <MultiCombobox
          closeOnValueChange
          isLoading={isLoadingCompanyOptions}
          label="Company"
          onValueChange={(companies) =>
            setFilters((current) => ({ ...current, companies }))
          }
          options={companyOptions}
          placeholder="Search company..."
          value={filters.companies}
        />
      </div>

      <div className="flex justify-end">
        <Button
          disabled={isApplying}
          onClick={onApply}
          size="lg"
          type="button"
        >
          {isApplying ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Searching...
            </>
          ) : (
            "Save preference"
          )}
        </Button>
      </div>
    </div>
  );
}
