"use client";

import {
  JobPreferencesForm,
  type JobProfileFilters,
} from "@/components/jobs/job-preferences-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type { JobProfileFilters } from "@/components/jobs/job-preferences-form";

type JobPreferencesDialogProps = {
  canClose?: boolean;
  companyOptions: string[];
  filters: JobProfileFilters;
  isApplying?: boolean;
  onApply: () => void;
  onClose: () => void;
  roleOptions: string[];
  setFilters: (
    value: JobProfileFilters | ((prev: JobProfileFilters) => JobProfileFilters),
  ) => void;
};

export function JobPreferencesDialog({
  canClose = true,
  companyOptions,
  filters,
  isApplying = false,
  onApply,
  onClose,
  roleOptions,
  setFilters,
}: JobPreferencesDialogProps) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && canClose) onClose();
      }}
    >
      <DialogContent
        className="gap-5 rounded-2xl p-6 sm:max-w-xl"
        showCloseButton={canClose}
      >
        <DialogHeader>
          <DialogTitle className="text-base font-extrabold uppercase tracking-wide text-black">
            Job preferences
          </DialogTitle>
        </DialogHeader>

        <JobPreferencesForm
          companyOptions={companyOptions}
          filters={filters}
          isApplying={isApplying}
          onApply={onApply}
          roleOptions={roleOptions}
          setFilters={setFilters}
        />
      </DialogContent>
    </Dialog>
  );
}
