"use client";

import type { LocalVideoTrack } from "livekit-client";
import { Mic, MicOff, Video } from "lucide-react";
import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { LiveWaveform } from "@/components/ui/live-waveform";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Spinner } from "../ui/spinner";
import {
  Header,
  PermissionStatusCard,
  PreJoinChecklist,
  RoundInfoCard,
} from "./prejoin-components";

type PermissionState = "checking" | "prompt" | "granted" | "denied";

interface PreJoinReadyStateProps {
  activeAudioDeviceId: string | undefined;
  activeVideoDeviceId: string | undefined;
  audioDevices: MediaDeviceInfo[];
  canJoin: boolean;
  deviceError: string | null;
  isCameraMuted: boolean;
  isJoining: boolean;
  isMicMuted: boolean;
  joinDisabledReason: string | null;
  permissionState: PermissionState;
  roundId?: string;
  selectedAudioLabel: string;
  selectedVideoLabel: string;
  showBackButton?: boolean;
  userName?: string | null;
  videoDevices: MediaDeviceInfo[];
  videoRef: RefObject<HTMLVideoElement | null>;
  videoTrack: LocalVideoTrack | undefined;
  onAudioDeviceChange: (deviceId: string | null) => void;
  onCameraMuteToggle: () => void;
  onJoin: () => void;
  onMicMuteToggle: () => void;
  onRequestPermission: () => void;
  onVideoDeviceChange: (deviceId: string | null) => void;
}

export function PreJoinReadyState({
  activeAudioDeviceId,
  activeVideoDeviceId,
  audioDevices,
  canJoin,
  deviceError,
  isCameraMuted,
  isJoining,
  isMicMuted,
  joinDisabledReason,
  permissionState,
  roundId,
  selectedAudioLabel,
  selectedVideoLabel,
  showBackButton = true,
  userName,
  videoDevices,
  videoRef,
  videoTrack,
  onAudioDeviceChange,
  onCameraMuteToggle: _onCameraMuteToggle,
  onJoin,
  onMicMuteToggle,
  onRequestPermission,
  onVideoDeviceChange,
}: PreJoinReadyStateProps) {
  const avatarFallback = getAvatarFallback(userName);

  return (
    <main className="flex min-h-dvh flex-col bg-background p-6">
      <Header showBackButton={showBackButton} />
      <section className="mx-auto w-full max-w-2xl space-y-6">
        {roundId ? <RoundInfoCard roundId={roundId} /> : null}

        {permissionState !== "granted" ? (
          <PermissionStatusCard permissionState={permissionState} />
        ) : null}

        {permissionState === "granted" ? (
          <div className="space-y-4">
            {/* Video preview */}
            <div className="overflow-hidden rounded-xl border bg-[#EDE9F7] relative">
              <div className="relative aspect-video w-full">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className={cn(
                    "h-full w-full object-cover scale-x-[-1]",
                    isCameraMuted && "hidden",
                  )}
                />
                {(isCameraMuted || !videoTrack) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#EDE9F7]">
                    <div className="flex size-20 items-center justify-center rounded-full bg-[#DDD4F0] text-3xl font-semibold uppercase text-[#6548E4]">
                      {avatarFallback}
                    </div>
                  </div>
                )}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/40 backdrop-blur-sm rounded-full overflow-hidden px-3 h-13">
                  {/*<Button
                    type="button"
                    onClick={onCameraMuteToggle}
                    className="flex-1 bg-transparent flex size-9 items-center justify-center text-white transition hover:bg-transparent rounded-full"
                  >
                    {isCameraMuted ? (
                      <VideoOff className="size-6" />
                    ) : (
                      <Video className="size-6" />
                    )}
                  </Button>*/}
                  <Button
                    type="button"
                    disabled={audioDevices.length === 0}
                    onClick={onMicMuteToggle}
                    className="flex-1 bg-transparent flex size-9 items-center justify-center text-white transition hover:bg-transparent rounded-full disabled:opacity-50"
                  >
                    {isMicMuted ? (
                      <MicOff className="size-6" />
                    ) : (
                      <Mic className="size-6" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Camera selector */}
            <div className="grid  md:grid-cols-2 gap-4">
              <div className="col-span-1">
                <Select
                  value={activeVideoDeviceId || ""}
                  disabled={videoDevices.length === 0}
                  onValueChange={onVideoDeviceChange}
                >
                  <SelectTrigger className="w-full">
                    <Video className="size-4 mr-2 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Select camera">
                      {selectedVideoLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {videoDevices.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Microphone selector */}
              <div className="col-span-1">
                <Select
                  value={activeAudioDeviceId || ""}
                  disabled={audioDevices.length === 0}
                  onValueChange={onAudioDeviceChange}
                >
                  <SelectTrigger className="w-full">
                    <Mic className="size-4 mr-2 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Select microphone">
                      {selectedAudioLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {audioDevices.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Waveform */}
            <div className="space-y-2">
              <p className="text-center text-sm text-muted-foreground">
                Speak and test your mic
              </p>
              <div className="h-12 overflow-hidden rounded-lg bg-[#F2F2F2] p-3">
                <LiveWaveform
                  active={!isMicMuted}
                  deviceId={
                    activeAudioDeviceId === "default"
                      ? undefined
                      : activeAudioDeviceId || undefined
                  }
                  mode="scrolling"
                  height="100%"
                  barWidth={3}
                  barGap={2}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        ) : null}

        {deviceError ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {deviceError}
          </div>
        ) : null}

        <div className="flex">
          {permissionState === "granted" ? (
            <Button
              className="mx-auto h-auto w-full rounded-full bg-button py-3"
              disabled={isJoining || !canJoin}
              onClick={onJoin}
            >
              {isJoining ? (
                <>
                  <Spinner />
                  Joining...
                </>
              ) : (
                "Join interview"
              )}
            </Button>
          ) : (
            <Button
              className="mx-auto h-auto w-full rounded-full bg-button py-3"
              type="button"
              onClick={onRequestPermission}
            >
              Allow access and continue
            </Button>
          )}
        </div>

        {permissionState === "granted" && joinDisabledReason ? (
          <p className="text-center text-sm font-medium text-destructive">
            {joinDisabledReason}
          </p>
        ) : null}

        <PreJoinChecklist />
      </section>
    </main>
  );
}

function getAvatarFallback(value: string | null | undefined) {
  const source = value?.trim() || "User";
  return source.charAt(0).toUpperCase();
}
