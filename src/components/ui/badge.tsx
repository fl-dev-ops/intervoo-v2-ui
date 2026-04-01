import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-slate-800 text-slate-200",
        outline: "border border-slate-700 bg-transparent text-slate-300",
        amber: "bg-amber-400 text-slate-950",
        green: "bg-emerald-400 text-slate-950",
        coral: "bg-orange-400 text-slate-950",
        blue: "bg-blue-400 text-slate-950",
        violet: "bg-violet-400 text-slate-950",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
