import { Fragment, type ComponentProps, type Ref } from "react";
import { type MotionProps, motion } from "motion/react";
import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const agentChatIndicatorVariants = cva("inline-flex items-center justify-center", {
  variants: {
    size: {
      sm: "h-3 w-7 gap-1",
      md: "h-4 w-8 gap-1",
      lg: "h-5 w-10 gap-1.5",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

const agentChatIndicatorDotVariants = cva("rounded-full bg-slate-500 dark:bg-slate-400", {
  variants: {
    size: {
      sm: "size-1.5",
      md: "size-2",
      lg: "size-2.5",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export interface AgentChatIndicatorProps extends MotionProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  ref?: Ref<HTMLSpanElement>;
}

export function AgentChatIndicator({
  size = "md",
  className,
  ...props
}: AgentChatIndicatorProps &
  ComponentProps<"span"> &
  VariantProps<typeof agentChatIndicatorVariants>) {
  return (
    <span className={cn(agentChatIndicatorVariants({ size }), className)} {...props}>
      {[0, 1, 2].map((index) => (
        <Fragment key={index}>
          <motion.span
            animate={{
              opacity: [0.35, 1, 0.35],
              y: [0, -1.5, 0],
              scale: [0.9, 1, 0.9],
            }}
            transition={{
              duration: 0.8,
              ease: "easeInOut",
              repeat: Infinity,
              delay: index * 0.12,
            }}
            className={cn(agentChatIndicatorDotVariants({ size }))}
          />
        </Fragment>
      ))}
    </span>
  );
}
