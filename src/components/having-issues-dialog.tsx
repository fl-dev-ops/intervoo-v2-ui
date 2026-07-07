"use client";

import posthog from "posthog-js";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { HavingIssuesContext } from "@/constants/having-issues";
import { cn } from "@/lib/utils";

type HavingIssuesDialogProps = {
  context: HavingIssuesContext;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function HavingIssuesDialog({
  context,
  onOpenChange,
  open,
}: HavingIssuesDialogProps) {
  const [details, setDetails] = useState("");
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setDetails("");
      setSelectedIssues([]);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    posthog.capture("having_issues_reported", {
      details: details.trim() || undefined,
      issues: selectedIssues,
      route: context.route,
      step: context.step ?? undefined,
      variant: context.key,
    });
    toast.success("Issue reported successfully");
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-3xl p-6 sm:max-w-2xl sm:p-8">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pr-8">
            <DialogTitle className="text-2xl font-bold leading-tight text-black">
              {context.title}
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed text-[#777379]">
              {context.description}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-6">
            {context.sections.map((section, sectionIndex) => (
              <fieldset key={section.title ?? sectionIndex}>
                {section.title ? (
                  <legend className="mb-3 text-base font-semibold text-[#56515A]">
                    {section.title}
                  </legend>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  {section.options.map((option, optionIndex) => {
                    const value = `${section.title ?? "issue"}:${option}`;
                    const checked = selectedIssues.includes(value);
                    const inputId = `having-issues-${sectionIndex}-${optionIndex}`;

                    return (
                      <label
                        htmlFor={inputId}
                        key={value}
                        className={cn(
                          "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-base text-[#302D33] transition-colors",
                          checked
                            ? "border-[#6242E8] bg-white"
                            : "border-transparent bg-[#F7F4FC]",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          className="size-5 data-checked:border-[#6242E8] data-checked:bg-[#6242E8]"
                          id={inputId}
                          onCheckedChange={(nextChecked) =>
                            setSelectedIssues((current) =>
                              nextChecked
                                ? [...current, value]
                                : current.filter((issue) => issue !== value),
                            )
                          }
                        />
                        {option}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            <label
              className={cn(
                "flex min-h-12 w-fit cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-base text-[#302D33] transition-colors",
                selectedIssues.includes("other")
                  ? "border-[#6242E8] bg-white"
                  : "border-transparent bg-[#F7F4FC]",
              )}
              htmlFor="having-issues-other"
            >
              <Checkbox
                checked={selectedIssues.includes("other")}
                className="size-5 data-checked:border-[#6242E8] data-checked:bg-[#6242E8]"
                id="having-issues-other"
                onCheckedChange={(checked) =>
                  setSelectedIssues((current) =>
                    checked
                      ? [...current, "other"]
                      : current.filter((issue) => issue !== "other"),
                  )
                }
              />
              Others
            </label>

            <div>
              <label
                className="mb-2 block text-base font-semibold text-[#56515A]"
                htmlFor="having-issues-details"
              >
                Tell us more
              </label>
              <Textarea
                className="min-h-36 resize-none bg-white p-4 text-base"
                id="having-issues-details"
                onChange={(event) => setDetails(event.target.value)}
                placeholder={context.textareaPlaceholder}
                value={details}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              disabled={selectedIssues.length === 0}
              size="lg"
              type="submit"
            >
              Report Issue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
