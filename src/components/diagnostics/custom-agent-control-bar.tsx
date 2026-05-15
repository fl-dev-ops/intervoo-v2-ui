"use client";

import type { Track } from "livekit-client";
import { Mic, MicOff, PhoneOffIcon, Video, VideoOff } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import {
  type UseInputControlsProps,
  useInputControls,
  usePublishPermissions,
} from "@/hooks/agents-ui/use-agent-control-bar";
import { cn } from "@/lib/utils";
import { LiveWaveform } from "../ui/live-waveform";

/** Configuration for which controls to display in the AgentControlBar. */
export interface AgentControlBarControls {
  /**
   * Whether to show the leave/disconnect button.
   *
   * @defaultValue true
   */
  leave?: boolean;
  /**
   * Whether to show the camera toggle control.
   *
   * @defaultValue true (if camera publish permission is granted)
   */
  camera?: boolean;
  /**
   * Whether to show the microphone toggle control.
   *
   * @defaultValue true (if microphone publish permission is granted)
   */
  microphone?: boolean;
}

export interface AgentControlBarProps extends UseInputControlsProps {
  /**
   * This takes an object with the following keys: `leave`, `microphone`, `camera`.
   * Each key maps to a boolean value that determines whether the control is displayed.
   *
   * @default
   * {
   *   leave: true,
   *   microphone: true,
   *   camera: true,
   * }
   */
  controls?: AgentControlBarControls;
  /**
   * Whether to save user choices.
   *
   * @default true
   */
  saveUserChoices?: boolean;
  /**
   * Whether the agent is connected to a session.
   *
   * @default false
   */
  isConnected?: boolean;
  /** The callback for when the user disconnects. */
  onDisconnect?: () => void;
  /** The callback for when a device error occurs. */
  onDeviceError?: (error: { source: Track.Source; error: Error }) => void;
}

/**
 * A control bar specifically designed for voice assistant interfaces. Provides controls for
 * microphone, camera, and disconnect.
 *
 * @example
 *
 * ```tsx
 * <AgentControlBar
 *   isConnected={true}
 *   onDisconnect={() => handleDisconnect()}
 *   controls={{
 *     microphone: true,
 *     camera: true,
 *     leave: true,
 *   }}
 * />;
 * ```
 *
 * @extends ComponentProps<'div'>
 */
export function CustomAgentControlBar({
  controls,
  isConnected = false,
  saveUserChoices = true,
  onDisconnect,
  onDeviceError,
  className,
  ...props
}: AgentControlBarProps & ComponentProps<"div">) {
  const handleClick = () => {
    onDisconnect?.();
  };

  const publishPermissions = usePublishPermissions();
  const { cameraToggle, microphoneToggle } = useInputControls({
    onDeviceError,
    saveUserChoices,
  });

  const visibleControls = {
    leave: controls?.leave ?? true,
    microphone: controls?.microphone ?? publishPermissions.microphone,
    camera: controls?.camera ?? publishPermissions.camera,
  };

  const isEmpty = Object.values(visibleControls).every((value) => !value);

  if (isEmpty) {
    console.warn(
      "AgentControlBar: `visibleControls` contains only false values.",
    );
    return null;
  }

  return (
    <div
      className={cn(
        "bg-transparent flex flex-col p-3",
        "rounded-lg",
        className,
      )}
      {...props}
    >
      <div className="flex gap-2 items-center justify-between max-w-md w-full mx-auto">
        {/* Camera */}
        {visibleControls.camera && (
          <Button
            size="icon-lg"
            type="button"
            variant={cameraToggle.enabled ? "secondary" : "outline"}
            disabled={cameraToggle.pending}
            aria-label={
              cameraToggle.enabled ? "Turn camera off" : "Turn camera on"
            }
            onClick={() => void cameraToggle.toggle()}
            className="h-12 w-12 rounded-full border-white/15 bg-white/10 p-2 text-white hover:bg-white/20 disabled:opacity-50"
          >
            {cameraToggle.enabled ? <Video /> : <VideoOff />}
          </Button>
        )}

        {/* microphone */}
        {visibleControls.microphone && (
          <Button
            size="icon-lg"
            type="button"
            variant={microphoneToggle.enabled ? "secondary" : "outline"}
            disabled={microphoneToggle.pending}
            aria-label={
              microphoneToggle.enabled
                ? "Turn microphone off"
                : "Turn microphone on"
            }
            onClick={() => void microphoneToggle.toggle()}
            className="h-12 w-12 rounded-full border-white/15 bg-white/10 p-2 text-white hover:bg-white/20 disabled:opacity-50"
          >
            {microphoneToggle.enabled ? <Mic /> : <MicOff />}
          </Button>
        )}

        {/* Audio waveform */}
        <div className="flex-1 border-white/15 bg-white/10 rounded-full px-4">
          <LiveWaveform
            active={microphoneToggle.enabled ? true : false}
            mode="scrolling"
            height={"50px"}
            className="text-white"
          />
        </div>

        {/* Disconnect */}
        {visibleControls.leave && (
          <Button
            size={"icon-lg"}
            variant={"destructive"}
            disabled={!isConnected}
            aria-label="End call"
            onClick={handleClick}
            className={
              "rounded-full p-2 h-12 w-12 bg-destructive/75 text-white"
            }
          >
            <PhoneOffIcon size={"10"} />
          </Button>
        )}
      </div>
    </div>
  );
}
