"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MultiCombobox } from "@/components/ui/multi-combobox";

export type JobProfileFilters = {
  companies: string[];
  roles: string[];
};

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

        <div className="space-y-4">
          <MultiCombobox
            closeOnValueChange
            label="Role"
            onValueChange={(roles) =>
              setFilters((prev) => ({ ...prev, roles }))
            }
            options={roleOptions}
            placeholder="Search role..."
            value={filters.roles}
          />
          <MultiCombobox
            closeOnValueChange
            label="Company"
            onValueChange={(companies) =>
              setFilters((prev) => ({ ...prev, companies }))
            }
            options={companyOptions}
            placeholder="Search company..."
            value={filters.companies}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            size="lg"
            disabled={isApplying}
            onClick={onApply}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
