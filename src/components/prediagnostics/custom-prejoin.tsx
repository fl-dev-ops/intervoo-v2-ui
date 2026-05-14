"use client";

import {
  useMediaDeviceSelect,
  usePreviewTracks,
} from "@livekit/components-react";
import { type LocalVideoTrack, Track } from "livekit-client";
import {
  ArrowLeft,
  CheckIcon,
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
  TriangleAlert,
  User,
  Video,
  VideoIcon,
  VideoOff,
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
import type { CoachOption } from "@/lib/coaches";
import { getRoundConfig } from "@/lib/diagnostics/rounds-config";
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
  const [isCameraMuted, setIsCameraMuted] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);

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

  // Mute/unmute video track
  useEffect(() => {
    if (!videoTrack) return;
    if (isCameraMuted) {
      void videoTrack.mute();
    } else {
      void videoTrack.unmute();
    }
  }, [isCameraMuted, videoTrack]);

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
        selected_job?: {
          title: string;
          description: string;
          salary: string;
          companies: string[];
        };
      };

      if (flow === "diagnostics") {
        const params = new URLSearchParams({
          token: data.participant_token,
          server_url: data.server_url,
          room_name: data.room_name,
          session_id: data.session_id,
          round_id: roundId || "",
        });
        if (data.selected_job) {
          params.set("job_title", data.selected_job.title);
          params.set("companies", data.selected_job.companies.join(","));
          params.set("salary", data.selected_job.salary);
        }
        if (selectedCoach) {
          params.set("coach", selectedCoach);
        }
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
      <main className="flex h-svh items-center justify-center bg-lavender">
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
    return (
      <PreJoinPermissionRequest
        onRequestPermission={requestPermission}
        showBackButton={flow !== "prediagnostics"}
      />
    );
  }

  return (
    <PreJoinReadyState
      activeAudioDeviceId={activeAudioDeviceId}
      activeVideoDeviceId={activeVideoDeviceId}
      audioDevices={audioDevices}
      deviceError={deviceError}
      flow={flow}
      isCameraMuted={isCameraMuted}
      isJoining={isJoining}
      isMicMuted={isMicMuted}
      permissionState={permissionState}
      roundId={roundId}
      selectedAudioLabel={selectedAudioLabel}
      selectedVideoLabel={selectedVideoLabel}
      showBackButton={flow !== "prediagnostics"}
      videoDevices={videoDevices}
      videoRef={videoRef}
      videoTrack={videoTrack}
      onAudioDeviceChange={handleAudioDeviceChange}
      onCameraMuteToggle={() => setIsCameraMuted((v) => !v)}
      onJoin={handleJoin}
      onMicMuteToggle={() => setIsMicMuted((v) => !v)}
      onRequestPermission={requestPermission}
      onVideoDeviceChange={handleVideoDeviceChange}
    />
  );
}

function PreJoinPermissionRequest({
  onRequestPermission,
  showBackButton = true,
}: {
  onRequestPermission: () => void;
  showBackButton?: boolean;
}) {
  return (
    <main className="flex min-h-svh flex-col bg-background px-5 py-8">
      <Header showBackButton={showBackButton} />
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
              Allow access and continue
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
  flow,
  isCameraMuted,
  isJoining,
  isMicMuted,
  permissionState,
  roundId,
  selectedAudioLabel,
  selectedVideoLabel,
  showBackButton = true,
  videoDevices,
  videoRef,
  videoTrack,
  onAudioDeviceChange,
  onCameraMuteToggle,
  onJoin,
  onMicMuteToggle,
  onRequestPermission,
  onVideoDeviceChange,
}: {
  activeAudioDeviceId: string | undefined;
  activeVideoDeviceId: string | undefined;
  audioDevices: MediaDeviceInfo[];
  deviceError: string | null;
  flow?: FlowType;
  isCameraMuted: boolean;
  isJoining: boolean;
  isMicMuted: boolean;
  permissionState: PermissionState;
  roundId?: string;
  selectedAudioLabel: string;
  selectedVideoLabel: string;
  showBackButton?: boolean;
  videoDevices: MediaDeviceInfo[];
  videoRef: RefObject<HTMLVideoElement | null>;
  videoTrack: LocalVideoTrack | undefined;
  onAudioDeviceChange: (deviceId: string | null) => void;
  onCameraMuteToggle: () => void;
  onJoin: () => void;
  onMicMuteToggle: () => void;
  onRequestPermission: () => void;
  onVideoDeviceChange: (deviceId: string | null) => void;
}) {
  return (
    <main className="flex min-h-dvh flex-col bg-background p-6">
      <Header showBackButton={showBackButton} />
      <section className="mx-auto w-full max-w-2xl space-y-6">
        {roundId ? (
          <RoundInfoCard roundId={roundId} />
        ) : flow === "prediagnostics" ? (
          <PrediagnosticsInfoCard />
        ) : null}

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
                    "h-full w-full object-cover",
                    isCameraMuted && "hidden",
                  )}
                />
                {(isCameraMuted || !videoTrack) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#EDE9F7]">
                    <div className="flex size-16 items-center justify-center rounded-full bg-[#DDD4F0]">
                      <User className="size-8 text-[#9B8BC3]" />
                    </div>
                  </div>
                )}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/40 backdrop-blur-sm rounded-full overflow-hidden px-3 h-13">
                  <Button
                    type="button"
                    onClick={onCameraMuteToggle}
                    className="flex-1 bg-transparent flex size-9 items-center justify-center text-white transition hover:bg-transparent rounded-full"
                  >
                    {isCameraMuted ? (
                      <VideoOff className="size-6" />
                    ) : (
                      <Video className="size-6" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    onClick={onMicMuteToggle}
                    className="flex-1 bg-transparent flex size-9 items-center justify-center text-white  transition hover:bg-transparent rounded-full"
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
              disabled={isJoining}
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

        <PreJoinChecklist />
      </section>
    </main>
  );
}

function RoundInfoCard({ roundId }: { roundId: string }) {
  const [expanded, setExpanded] = useState(false);
  const config = getRoundConfig(roundId);
  if (!config) return null;

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <span className="text-sm font-semibold">
          {config.eyebrow} - {config.title}
        </span>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {config.duration}
          </span>
          {expanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
      )}
    </div>
  );
}

function PrediagnosticsInfoCard() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <span className="text-sm font-semibold">
          Pre-diagnostic - Screening Interview
        </span>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            15 min
          </span>
          {expanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          <p className="text-sm text-muted-foreground">
            This session evaluates your background, communication clarity, and
            career intent. You&apos;ll introduce yourself, talk about your
            interests, and explain the roles you&apos;re aiming for.
          </p>
        </div>
      )}
    </div>
  );
}

function PreJoinChecklist() {
  return (
    <div className="rounded-2xl bg-[#F4F4F4] px-5 py-4 space-y-3">
      <p className="text-sm text-muted-foreground">Make sure you will have</p>
      <div className="space-y-3">
        {["Quiet space", "Good light", "Stable internet connectivity"].map(
          (item) => (
            <div key={item} className="flex items-center gap-2 text-sm">
              <CheckIcon className="size-5 bg-green-500 shrink-0 bg-green text-white rounded-full p-1" />
              {item}
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function PermissionStatusCard({
  permissionState,
}: {
  permissionState: PermissionState;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-white p-4">
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

function Header({ showBackButton = true }: { showBackButton?: boolean }) {
  const router = useRouter();
  return (
    <header className="w-full mx-auto mb-6">
      {showBackButton && (
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm font-medium text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
      )}
    </header>
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
