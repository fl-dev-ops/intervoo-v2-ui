"use client";

import {
  useMediaDeviceSelect,
  usePreviewTracks,
} from "@livekit/components-react";
import { type LocalVideoTrack, Track } from "livekit-client";
import {
  TriangleAlert,
  Video,
  VideoIcon,
  VideoOff,
  Volume2,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { LiveWaveform } from "@/components/ui/live-waveform";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type CoachOption, coachCards } from "@/lib/coaches";
import { cn } from "@/lib/utils";
import { Spinner } from "../ui/spinner";

type PermissionState = "checking" | "prompt" | "granted" | "denied";

type SessionType = "audio" | "video";
type FlowType = "prediagnostics" | "diagnostics";

interface CustomPreJoinProps {
  type?: SessionType;
  flow?: FlowType;
  roundId?: string;
  coach?: CoachOption;
  hideCoachSelection?: boolean;
}

export function CustomPreJoin({
  coach,
  flow = "prediagnostics",
  hideCoachSelection = false,
  roundId,
}: CustomPreJoinProps) {
  const router = useRouter();

  const [permissionState, setPermissionState] =
    useState<PermissionState>("checking");
  const [hasRequested, setHasRequested] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<CoachOption | undefined>(
    coach ?? (hideCoachSelection ? undefined : "sana"),
  );

  useEffect(() => {
    setSelectedCoach(coach ?? (hideCoachSelection ? undefined : "sana"));
  }, [coach, hideCoachSelection]);

  // Audio devices
  const {
    devices: audioDevices,
    activeDeviceId: activeAudioDeviceId,
    setActiveMediaDevice: setActiveAudioDevice,
  } = useMediaDeviceSelect({
    kind: "audioinput",
    requestPermissions: permissionState === "granted",
  });

  // Video devices
  const {
    devices: videoDevices,
    activeDeviceId: activeVideoDeviceId,
    setActiveMediaDevice: setActiveVideoDevice,
  } = useMediaDeviceSelect({
    kind: "videoinput",
    requestPermissions: permissionState === "granted",
  });

  // Auto-select first/default device when devices load
  useEffect(() => {
    if (audioDevices.length > 0 && !activeAudioDeviceId) {
      const defaultDevice = audioDevices.find((d) =>
        d.deviceId.toLowerCase().includes("default"),
      );
      void setActiveAudioDevice(
        defaultDevice ? defaultDevice.deviceId : audioDevices[0].deviceId,
      );
    }
  }, [audioDevices, activeAudioDeviceId, setActiveAudioDevice]);

  useEffect(() => {
    if (
      videoDevices.length > 0 &&
      (activeVideoDeviceId === "default" ||
        !videoDevices.some((device) => device.deviceId === activeVideoDeviceId))
    ) {
      void setActiveVideoDevice(videoDevices[0].deviceId);
    }
  }, [videoDevices, activeVideoDeviceId, setActiveVideoDevice]);

  // Video preview
  const videoRef = useRef<HTMLVideoElement>(null);
  const handlePreviewError = useCallback((error: Error) => {
    setDeviceError(error.message);
  }, []);
  const previewTracks = usePreviewTracks(
    {
      audio: false,
      video:
        permissionState === "granted"
          ? {
              deviceId:
                activeVideoDeviceId && activeVideoDeviceId !== "default"
                  ? activeVideoDeviceId
                  : undefined,
            }
          : false,
    },
    handlePreviewError,
  );
  const videoTrack = previewTracks?.find(
    (track) => track.kind === Track.Kind.Video,
  ) as LocalVideoTrack | undefined;

  useEffect(() => {
    if (!videoRef.current || !videoTrack) return;

    const videoElement = videoRef.current;
    videoTrack.unmute();
    videoTrack.attach(videoElement);

    return () => {
      videoTrack.detach(videoElement);
    };
  }, [videoTrack]);

  // Check browser permission state on mount
  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        if (navigator.permissions) {
          try {
            const status = await navigator.permissions.query({
              name: "camera" as PermissionName,
            });
            if (cancelled) return;

            if (status.state === "granted") {
              setPermissionState("granted");
            } else if (status.state === "denied") {
              setPermissionState("denied");
            } else {
              setPermissionState("prompt");
            }

            status.onchange = () => {
              if (status.state === "granted") {
                setPermissionState("granted");
                setDeviceError(null);
              } else if (status.state === "denied") {
                setPermissionState("denied");
              }
            };
            return;
          } catch {
            // Some browsers don't support camera permission querying
          }
        }

        if (!cancelled) setPermissionState("prompt");
      } catch {
        if (!cancelled) setPermissionState("prompt");
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  // Request microphone (and optionally camera) permission
  const requestPermission = useCallback(async () => {
    setHasRequested(true);
    setDeviceError(null);

    try {
      const constraints: MediaStreamConstraints = {
        audio:
          activeAudioDeviceId && activeAudioDeviceId !== "default"
            ? { deviceId: { exact: activeAudioDeviceId } }
            : true,
        video:
          activeVideoDeviceId && activeVideoDeviceId !== "default"
            ? { deviceId: { exact: activeVideoDeviceId } }
            : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      setPermissionState("granted");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "We couldn't access your microphone or camera.";
      setDeviceError(message);
      setPermissionState("denied");
    }
  }, [activeAudioDeviceId, activeVideoDeviceId]);

  const handleAudioDeviceChange = useCallback(
    (deviceId: string | null) => {
      if (!deviceId) return;
      void setActiveAudioDevice(deviceId);
    },
    [setActiveAudioDevice],
  );

  const handleVideoDeviceChange = useCallback(
    (deviceId: string | null) => {
      if (!deviceId) return;
      void setActiveVideoDevice(deviceId);
    },
    [setActiveVideoDevice],
  );

  const handleJoin = useCallback(async () => {
    setIsJoining(true);
    setDeviceError(null);

    try {
      const response = await fetch("/api/livekit/connection-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          flow === "diagnostics"
            ? {
                round_id: roundId,
                type: "DIAGNOSTIC_ROUND",
                ...(selectedCoach ? { coach: selectedCoach } : {}),
              }
            : {
                type: "PREDIAGNOSTIC",
                device_id: activeAudioDeviceId || "",
                video_device_id: activeVideoDeviceId || "",
                interaction_mode: "ptt",
                ...(selectedCoach ? { coach: selectedCoach } : {}),
              },
        ),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || "Failed to create session");
      }

      const data = (await response.json()) as {
        server_url: string;
        room_name: string;
        participant_token: string;
        session_id: string;
        interaction_mode: string;
      };

      if (flow === "diagnostics") {
        const params = new URLSearchParams({
          token: data.participant_token,
          server_url: data.server_url,
          room_name: data.room_name,
          session_id: data.session_id,
        });
        router.push(`/diagnostics/session?${params.toString()}`);
      } else {
        const params = new URLSearchParams({
          token: data.participant_token,
          url: data.server_url,
          room: data.room_name,
          session: data.session_id,
        });
        params.set("video", "true");
        if (data.interaction_mode) {
          params.set("mode", data.interaction_mode);
        }
        router.push(`/prediagnostics/session?${params.toString()}`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to join session.";
      setDeviceError(message);
      setIsJoining(false);
    }
  }, [
    activeAudioDeviceId,
    activeVideoDeviceId,
    flow,
    roundId,
    router,
    selectedCoach,
  ]);

  const selectedAudioLabel =
    audioDevices.find((d) => d.deviceId === activeAudioDeviceId)?.label ||
    "Select microphone";

  const selectedVideoLabel =
    videoDevices.find((d) => d.deviceId === activeVideoDeviceId)?.label ||
    "Select camera";

  if (permissionState === "checking") {
    return (
      <main className="flex h-svh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          <p className="text-sm text-muted-foreground">
            Checking microphone and camera access...
          </p>
        </div>
      </main>
    );
  }

  if (!hasRequested && permissionState !== "granted") {
    return <PreJoinPermissionRequest onRequestPermission={requestPermission} />;
  }

  return (
    <PreJoinReadyState
      activeAudioDeviceId={activeAudioDeviceId}
      activeVideoDeviceId={activeVideoDeviceId}
      audioDevices={audioDevices}
      deviceError={deviceError}
      hideCoachSelection={hideCoachSelection}
      isJoining={isJoining}
      permissionState={permissionState}
      selectedAudioLabel={selectedAudioLabel}
      selectedCoach={selectedCoach}
      selectedVideoLabel={selectedVideoLabel}
      videoDevices={videoDevices}
      videoRef={videoRef}
      videoTrack={videoTrack}
      onAudioDeviceChange={handleAudioDeviceChange}
      onJoin={handleJoin}
      onRequestPermission={requestPermission}
      onSelectedCoachChange={setSelectedCoach}
      onVideoDeviceChange={handleVideoDeviceChange}
    />
  );
}

function PreJoinPermissionRequest({
  onRequestPermission,
}: {
  onRequestPermission: () => void;
}) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-5 py-8">
      <section className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-md flex-col justify-center">
        <div className="flex justify-center">
          <Image
            alt="Enable device access"
            className="h-auto w-full max-w-70"
            height={287}
            priority
            src="/pre-join-access.svg"
            width={280}
          />
        </div>

        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight">
              Allow camera & microphone access
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your camera and microphone help us conduct the interview and
              generate accurate feedback.
            </p>
          </div>

          <div className="space-y-4 flex">
            <Button
              className="mx-auto bg-button rounded-full py-3 h-auto w-full"
              type="button"
              onClick={onRequestPermission}
            >
              <VideoIcon className="size-4 mr-2" />
              Enable mic & camera
            </Button>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-[#EFE8BE] bg-[#FFFBE8] px-5 py-4 text-[#6B6B72]">
            <TriangleAlert className="mt-1 size-5 shrink-0 text-[#E4BE3D]" />
            <p className="text-sm">
              This interview cannot be paused{" "}
              <span className="font-semibold">(~15 mins)</span> Keep your camera
              on.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function PreJoinReadyState({
  activeAudioDeviceId,
  activeVideoDeviceId,
  audioDevices,
  deviceError,
  hideCoachSelection,
  isJoining,
  permissionState,
  selectedAudioLabel,
  selectedCoach,
  selectedVideoLabel,
  videoDevices,
  videoRef,
  videoTrack,
  onAudioDeviceChange,
  onJoin,
  onRequestPermission,
  onSelectedCoachChange,
  onVideoDeviceChange,
}: {
  activeAudioDeviceId: string | undefined;
  activeVideoDeviceId: string | undefined;
  audioDevices: MediaDeviceInfo[];
  deviceError: string | null;
  hideCoachSelection: boolean;
  isJoining: boolean;
  permissionState: PermissionState;
  selectedAudioLabel: string;
  selectedCoach: CoachOption | undefined;
  selectedVideoLabel: string;
  videoDevices: MediaDeviceInfo[];
  videoRef: RefObject<HTMLVideoElement | null>;
  videoTrack: LocalVideoTrack | undefined;
  onAudioDeviceChange: (deviceId: string | null) => void;
  onJoin: () => void;
  onRequestPermission: () => void;
  onSelectedCoachChange: (coach: CoachOption) => void;
  onVideoDeviceChange: (deviceId: string | null) => void;
}) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-5 py-8">
      <section className="mx-auto w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight">
            Camera & microphone ready
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Make sure your camera and microphone are working well before you
            join.
          </p>
        </div>

        <div className="space-y-4">
          {permissionState !== "granted" ? (
            <PermissionStatusCard permissionState={permissionState} />
          ) : null}

          {permissionState === "granted" ? (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="overflow-hidden rounded-xl border bg-black">
                  <div className="relative aspect-video w-full">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                    {!videoTrack ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted">
                        <VideoOff className="size-12 text-muted-foreground" />
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Camera</p>
                  <Select
                    value={activeVideoDeviceId || ""}
                    onValueChange={onVideoDeviceChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select camera">
                        {selectedVideoLabel}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {videoDevices.map((device) => (
                        <SelectItem
                          key={device.deviceId}
                          value={device.deviceId}
                        >
                          {device.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                {!hideCoachSelection ? (
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium">Coach voice</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        You can switch coaches before each session.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {coachCards.map((coach) => (
                        <button
                          key={coach.value}
                          className={cn(
                            "overflow-hidden rounded-xl border bg-input/30 text-left shadow-sm transition",
                            selectedCoach === coach.value
                              ? "border-foreground ring-1 ring-foreground"
                              : "border-border hover:border-foreground/30",
                          )}
                          type="button"
                          onClick={() => onSelectedCoachChange(coach.value)}
                        >
                          <div
                            className="relative aspect-[1.15] overflow-hidden"
                            style={{ backgroundColor: coach.tint }}
                          >
                            <Image
                              alt={coach.title}
                              className="object-cover"
                              fill
                              src={coach.imageSrc}
                            />
                          </div>
                          <div className="p-3 text-center text-sm font-medium">
                            {coach.title}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Microphone</p>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Volume2 className="size-3" />
                      Listening...
                    </span>
                  </div>
                  <div className="h-20 overflow-hidden rounded-lg border bg-input/30 p-3">
                    <LiveWaveform
                      active
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
                  <Select
                    value={activeAudioDeviceId || ""}
                    onValueChange={onAudioDeviceChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select microphone">
                        {selectedAudioLabel}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {audioDevices.map((device) => (
                        <SelectItem
                          key={device.deviceId}
                          value={device.deviceId}
                        >
                          {device.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : null}

          {deviceError ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {deviceError}
            </div>
          ) : null}

          <div className="flex items-start gap-3 rounded-2xl border border-[#EFE8BE] bg-[#FFFBE8] px-5 py-4 text-[#6B6B72]">
            <TriangleAlert className="mt-1 size-5 shrink-0 text-[#E4BE3D]" />
            <p className="text-sm">
              This interview cannot be paused{" "}
              <span className="font-semibold">(~15 mins)</span> Keep your camera
              on.
            </p>
          </div>

          <div className="flex">
            {permissionState === "granted" ? (
              <Button
                className="mx-auto h-auto w-full rounded-full bg-button py-3"
                disabled={isJoining}
                onClick={onJoin}
              >
                {isJoining ? (
                  <>
                    <Spinner />
                    Joining...
                  </>
                ) : (
                  "Start session"
                )}
              </Button>
            ) : (
              <Button
                className="mx-auto h-auto w-full rounded-full bg-button py-3"
                type="button"
                onClick={onRequestPermission}
              >
                <Spinner className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function PermissionStatusCard({
  permissionState,
}: {
  permissionState: PermissionState;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border p-4">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-full",
            permissionState === "denied"
              ? "bg-red-100 text-red-700"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Video className="size-5" />
        </div>
        <div>
          <p className="text-sm font-medium">Microphone & Camera</p>
          <p className="text-xs text-muted-foreground">
            {permissionState === "denied" ? "Blocked" : "Permission needed"}
          </p>
        </div>
      </div>
      <PermissionBadge state={permissionState} />
    </div>
  );
}

function PermissionBadge({ state }: { state: PermissionState }) {
  const config = {
    granted: { label: "Ready", className: "bg-green-100 text-green-700" },
    denied: { label: "Blocked", className: "bg-red-100 text-red-700" },
    prompt: { label: "Pending", className: "bg-muted text-muted-foreground" },
    checking: {
      label: "Checking",
      className: "bg-muted text-muted-foreground",
    },
  };

  const { label, className } = config[state];

  return (
    <span
      className={cn("rounded-full px-3 py-1 text-xs font-medium", className)}
    >
      {label}
    </span>
  );
}
