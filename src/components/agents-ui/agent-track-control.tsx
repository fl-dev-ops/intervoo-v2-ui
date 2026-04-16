"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type TrackReferenceOrPlaceholder,
  useMaybeRoomContext,
  useMediaDeviceSelect,
} from "@livekit/components-react";
import { type VariantProps, cva } from "class-variance-authority";
import { LocalAudioTrack, LocalVideoTrack } from "livekit-client";

import { AgentAudioVisualizerBar } from "@/components/agents-ui/agent-audio-visualizer-bar";
import { AgentTrackToggle } from "@/components/agents-ui/agent-track-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toggleVariants } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

const selectVariants = cva(
  [
    "rounded-l-none shadow-none pl-2",
    "text-slate-950 hover:text-slate-500 dark:text-slate-50 dark:hover:text-slate-400",
    "peer-data-[state=on]/track:bg-slate-100 peer-data-[state=on]/track:hover:bg-slate-950/10 dark:peer-data-[state=on]/track:bg-slate-800 dark:peer-data-[state=on]/track:hover:bg-slate-50/10",
    "peer-data-[state=off]/track:text-red-500 dark:peer-data-[state=off]/track:text-red-900",
    "peer-data-[state=off]/track:focus-visible:border-red-500 peer-data-[state=off]/track:focus-visible:ring-red-500/30 dark:peer-data-[state=off]/track:focus-visible:border-red-900 dark:peer-data-[state=off]/track:focus-visible:ring-red-900/30",
    "[&_svg]:opacity-100",
  ],
  {
    variants: {
      variant: {
        default: [
          "border-none",
          "peer-data-[state=off]/track:bg-red-500/10 dark:peer-data-[state=off]/track:bg-red-900/10",
          "peer-data-[state=off]/track:hover:bg-red-500/15 dark:peer-data-[state=off]/track:hover:bg-red-900/15",
          "peer-data-[state=off]/track:[&_svg]:text-destructive!",
          "dark:peer-data-[state=on]/track:bg-slate-100 dark:dark:peer-data-[state=on]/track:bg-slate-800",
          "dark:peer-data-[state=on]/track:hover:bg-slate-950/10 dark:dark:peer-data-[state=on]/track:hover:bg-slate-50/10",
          "dark:peer-data-[state=off]/track:bg-red-500/10 dark:dark:peer-data-[state=off]/track:bg-red-900/10",
          "dark:peer-data-[state=off]/track:hover:bg-red-500/15 dark:dark:peer-data-[state=off]/track:hover:bg-red-900/15",
        ],
        outline: [
          "border border-l-0",
          "peer-data-[state=off]/track:border-red-500/20 dark:peer-data-[state=off]/track:border-red-900/20",
          "peer-data-[state=off]/track:bg-red-500/10 dark:peer-data-[state=off]/track:bg-red-900/10",
          "peer-data-[state=off]/track:hover:bg-red-500/15 dark:peer-data-[state=off]/track:hover:bg-red-900/15",
          "peer-data-[state=off]/track:[&_svg]:text-destructive!",
          "peer-data-[state=on]/track:hover:border-slate-950/12 dark:peer-data-[state=on]/track:hover:border-slate-50/12",
          "dark:peer-data-[state=off]/track:bg-red-500/10 dark:dark:peer-data-[state=off]/track:bg-red-900/10",
          "dark:peer-data-[state=off]/track:hover:bg-red-500/15 dark:dark:peer-data-[state=off]/track:hover:bg-red-900/15",
          "dark:peer-data-[state=on]/track:bg-slate-100 dark:dark:peer-data-[state=on]/track:bg-slate-800",
          "dark:peer-data-[state=on]/track:hover:bg-slate-950/10 dark:dark:peer-data-[state=on]/track:hover:bg-slate-50/10",
        ],
      },
      size: {
        default: "w-[180px]",
        sm: "w-auto",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type TrackDeviceSelectProps = React.ComponentProps<typeof SelectTrigger> &
  VariantProps<typeof selectVariants> & {
    size?: "default" | "sm";
    variant?: "default" | "outline" | null;
    kind: MediaDeviceKind;
    track?: LocalAudioTrack | LocalVideoTrack | undefined;
    requestPermissions?: boolean;
    onMediaDeviceError?: (error: Error) => void;
    onDeviceListChange?: (devices: MediaDeviceInfo[]) => void;
    onActiveDeviceChange?: (deviceId: string) => void;
  };

function TrackDeviceSelect({
  kind,
  track,
  size = "default",
  variant = "default",
  className,
  requestPermissions = false,
  onMediaDeviceError,
  onDeviceListChange,
  onActiveDeviceChange,
  ...props
}: TrackDeviceSelectProps) {
  const room = useMaybeRoomContext();
  const [open, setOpen] = useState(false);
  const [requestPermissionsState, setRequestPermissionsState] = useState(requestPermissions);
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({
    room,
    kind,
    track,
    requestPermissions: requestPermissionsState,
    onError: onMediaDeviceError,
  });

  useEffect(() => {
    onDeviceListChange?.(devices);
  }, [devices, onDeviceListChange]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setRequestPermissionsState(true);
    }
  };

  const handleActiveDeviceChange = (deviceId: string) => {
    void setActiveMediaDevice(deviceId);
    onActiveDeviceChange?.(deviceId);
  };

  const filteredDevices = useMemo(
    () => devices.filter((device) => device.deviceId !== ""),
    [devices],
  );

  if (filteredDevices.length < 2) {
    return null;
  }

  return (
    <Select
      open={open}
      value={activeDeviceId}
      onOpenChange={handleOpenChange}
      onValueChange={handleActiveDeviceChange}
    >
      <SelectTrigger className={cn(selectVariants({ size, variant }), className)} {...props}>
        {size !== "sm" && (
          <SelectValue className="font-mono text-sm" placeholder={`Select a ${kind}`} />
        )}
      </SelectTrigger>
      <SelectContent position="popper">
        {filteredDevices.map((device) => (
          <SelectItem key={device.deviceId} value={device.deviceId} className="font-mono text-xs">
            {device.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export type AgentTrackControlProps = VariantProps<typeof toggleVariants> & {
  kind: MediaDeviceKind;
  source: "camera" | "microphone" | "screen_share";
  pressed?: boolean;
  pending?: boolean;
  disabled?: boolean;
  className?: string;
  audioTrack?: TrackReferenceOrPlaceholder;
  onPressedChange?: (pressed: boolean) => void;
  onMediaDeviceError?: (error: Error) => void;
  onActiveDeviceChange?: (deviceId: string) => void;
};

export function AgentTrackControl({
  kind,
  variant = "default",
  source,
  pressed,
  pending,
  disabled,
  className,
  audioTrack,
  onPressedChange,
  onMediaDeviceError,
  onActiveDeviceChange,
}: AgentTrackControlProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-0 rounded-md",
        variant === "outline" && "shadow-xs [&_button]:shadow-none",
        className,
      )}
    >
      <AgentTrackToggle
        variant={variant ?? "default"}
        source={source}
        pressed={pressed}
        pending={pending}
        disabled={disabled}
        onPressedChange={onPressedChange}
        className="peer/track group/track focus:z-10 has-[.audiovisualizer]:w-auto has-[.audiovisualizer]:px-3 has-[~_button]:rounded-r-none has-[~_button]:border-r-0 has-[~_button]:pr-2 has-[~_button]:pl-3"
      >
        {audioTrack && (
          <AgentAudioVisualizerBar
            size="icon"
            barCount={3}
            state={pressed ? "speaking" : "disconnected"}
            audioTrack={pressed ? audioTrack : undefined}
            className="audiovisualizer flex h-6 w-auto items-center justify-center gap-0.5"
          >
            <span
              className={cn([
                "h-full min-h-0.5 w-0.5 origin-center",
                "group-data-[state=on]/track:bg-slate-950 group-data-[state=off]/track:bg-red-500 dark:group-data-[state=on]/track:bg-slate-50 dark:group-data-[state=off]/track:bg-red-900",
                "data-lk-muted:bg-slate-100 dark:data-lk-muted:bg-slate-800",
              ])}
            />
          </AgentAudioVisualizerBar>
        )}
      </AgentTrackToggle>
      {kind ? (
        <TrackDeviceSelect
          size="sm"
          kind={kind}
          variant={variant}
          requestPermissions={false}
          onMediaDeviceError={onMediaDeviceError}
          onActiveDeviceChange={onActiveDeviceChange}
          className={cn([
            "relative",
            'before:bg-slate-200 before:absolute before:inset-y-0 before:left-0 before:my-2.5 before:w-px has-[~_button]:before:content-[""] dark:before:bg-slate-800',
            !pressed && "before:bg-red-500/20 dark:before:bg-red-900/20",
          ])}
        />
      ) : null}
    </div>
  );
}
