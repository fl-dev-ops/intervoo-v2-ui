"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";

interface ResumeCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  editing?: boolean;
  onEdit?: () => void;
  action?: React.ReactNode;
}

export function ResumeCard({
  title,
  children,
  className,
  editing,
  onEdit,
  action,
}: ResumeCardProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[18px] border border-[#E3E1E8] bg-white shadow-[0_16px_50px_rgba(55,38,97,0.06)]",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-[#EEEAF4] p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[#838383]">
          {title}
        </h3>
        <div className="flex items-center gap-2">
          {action}
        {onEdit && (
          editing ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="h-7 rounded-full px-3 text-xs font-bold text-[#5C3BD8] hover:bg-[#F3F0FA]"
              aria-label="Done editing"
            >
              Done
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="size-7 rounded-full text-black hover:bg-[#F3F0FA]"
              aria-label={`Edit ${title}`}
            >
              <Pencil className="size-3.5" />
            </Button>
          )
        )}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
