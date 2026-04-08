import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[#6A4DF5]/35",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(90deg,#4F33A3_0%,#6A4DF5_100%)] shadow-[0_12px_24px_rgba(93,72,220,0.28)] hover:opacity-95 text-white",
        secondary:
          "bg-white text-[#2b2233] shadow-[inset_0_0_0_1px_rgba(220,212,231,1)] hover:bg-[#f8f5fc]",
        outline:
          "bg-transparent text-[#4F33A3] shadow-[inset_0_0_0_1px_rgba(90,66,204,0.28)] hover:bg-[#f3eefb]",
        ghost: "text-[#2b2233] hover:bg-[#f3eefb]",
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
