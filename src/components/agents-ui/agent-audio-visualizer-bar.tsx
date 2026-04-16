"use client";

import React, {
  Children,
  cloneElement,
  isValidElement,
  useMemo,
  type CSSProperties,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  useMultibandTrackVolume,
  type AgentState,
  type TrackReferenceOrPlaceholder,
} from "#/shared/livekit";
import { type VariantProps, cva } from "class-variance-authority";
import { type LocalAudioTrack, type RemoteAudioTrack } from "#/shared/livekit";

import { useAgentAudioVisualizerBarAnimator } from "@/hooks/agents-ui/use-agent-audio-visualizer-bar";
import { cn } from "@/lib/utils";

function cloneSingleChild(
  children: ReactNode | ReactNode[],
  props?: Record<string, unknown>,
  key?: unknown,
) {
  return Children.map(children, (child) => {
    if (isValidElement(child) && Children.only(children)) {
      const childProps = child.props as Record<string, unknown>;
      if (childProps.className) {
        props ??= {};
        props.className = cn(childProps.className as string, props.className as string);
        props.style = {
          ...(childProps.style as CSSProperties),
          ...(props.style as CSSProperties),
        };
      }
      return cloneElement(child, {
        ...props,
        key: typeof key === "string" || typeof key === "number" ? key : undefined,
      });
    }

    return child;
  });
}

export const AgentAudioVisualizerBarElementVariants = cva(
  [
    "rounded-full transition-colors duration-250 ease-linear",
    "bg-current/10 data-[lk-highlighted=true]:bg-current",
  ],
  {
    variants: {
      size: {
        icon: "w-[4px] min-h-[4px]",
        sm: "w-[8px] min-h-[8px]",
        md: "w-[16px] min-h-[16px]",
        lg: "w-[32px] min-h-[32px]",
        xl: "w-[64px] min-h-[64px]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export const AgentAudioVisualizerBarVariants = cva("relative flex items-center justify-center", {
  variants: {
    size: {
      icon: "h-[24px] gap-[2px]",
      sm: "h-[56px] gap-[4px]",
      md: "h-[112px] gap-[8px]",
      lg: "h-[224px] gap-[16px]",
      xl: "h-[448px] gap-[32px]",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export interface AgentAudioVisualizerBarProps {
  size?: "icon" | "sm" | "md" | "lg" | "xl";
  state?: AgentState;
  color?: `#${string}`;
  barCount?: number;
  audioTrack?: LocalAudioTrack | RemoteAudioTrack | TrackReferenceOrPlaceholder;
  className?: string;
  children?: ReactNode;
}

export function AgentAudioVisualizerBar({
  size = "md",
  state = "connecting",
  color,
  barCount,
  audioTrack,
  className,
  children,
  style,
  ...props
}: AgentAudioVisualizerBarProps &
  VariantProps<typeof AgentAudioVisualizerBarVariants> &
  ComponentProps<"div">) {
  const resolvedBarCount = useMemo(() => {
    if (barCount) {
      return barCount;
    }

    switch (size) {
      case "icon":
      case "sm":
        return 3;
      default:
        return 5;
    }
  }, [barCount, size]);

  const volumeBands = useMultibandTrackVolume(audioTrack, {
    bands: resolvedBarCount,
    loPass: 100,
    hiPass: 200,
  });

  const sequencerInterval = useMemo(() => {
    switch (state) {
      case "connecting":
        return 2000 / resolvedBarCount;
      case "initializing":
        return 2000;
      case "listening":
        return 500;
      case "thinking":
        return 150;
      default:
        return 1000;
    }
  }, [resolvedBarCount, state]);

  const highlightedIndices = useAgentAudioVisualizerBarAnimator(
    state,
    resolvedBarCount,
    sequencerInterval,
  );

  const bands = useMemo(() => {
    if (state === "speaking") {
      return volumeBands;
    }

    return Array.from({ length: resolvedBarCount }, () => 0);
  }, [resolvedBarCount, state, volumeBands]);

  if (children && Array.isArray(children)) {
    throw new Error("AgentAudioVisualizerBar children must be a single element.");
  }

  return (
    <div
      data-lk-state={state}
      style={{ ...style, color } as CSSProperties}
      className={cn(AgentAudioVisualizerBarVariants({ size }), className)}
      {...props}
    >
      {bands.map((band: number, index: number) =>
        children ? (
          <React.Fragment key={index}>
            {cloneSingleChild(children, {
              "data-lk-index": index,
              "data-lk-highlighted": highlightedIndices.includes(index),
              style: { height: `${band * 100}%` },
            })}
          </React.Fragment>
        ) : (
          <div
            key={index}
            data-lk-index={index}
            data-lk-highlighted={highlightedIndices.includes(index)}
            style={{ height: `${band * 100}%` }}
            className={cn(AgentAudioVisualizerBarElementVariants({ size }))}
          />
        ),
      )}
    </div>
  );
}
