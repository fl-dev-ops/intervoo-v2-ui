import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70",
  {
    variants: {
      variant: {
        default:
          "bg-amber-400 text-slate-950 shadow-[0_0_0_1px_rgba(251,191,36,0.28)] hover:bg-amber-300",
        secondary:
          "bg-slate-900/90 text-slate-100 shadow-[inset_0_0_0_1px_rgba(71,85,105,0.55)] hover:bg-slate-800/90",
        outline:
          "bg-transparent text-slate-100 shadow-[inset_0_0_0_1px_rgba(71,85,105,0.55)] hover:bg-slate-900/70",
        ghost: "text-slate-200 hover:bg-slate-900/70",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-6",
        icon: "size-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
