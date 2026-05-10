"use client";

import { useMediaDeviceSelect } from "@livekit/components-react";
import { Camera, Mic, Video, VideoOff, Volume2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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

type PermissionState = "checking" | "prompt" | "granted" | "denied";

type SessionType = "audio" | "video";
type FlowType = "prediagnostics" | "diagnostics";
type CoachOption = "sana" | "arjun";

const coachCards = [
  {
    value: "sana" as const,
    title: "Sana",
    imageSrc: "/agent/sara.png",
    tint: "#b8b25b",
  },
  {
    value: "arjun" as const,
    title: "Arjun",
    imageSrc: "/agent/arjun.png",
    tint: "#8ea5c4",
  },
];

interface CustomPreJoinProps {
  type?: SessionType;
  flow?: FlowType;
  roundId?: string;
}

export function CustomPreJoin({
  flow = "prediagnostics",
  roundId,
  type = "audio",
}: CustomPreJoinProps) {
  const router = useRouter();
  const isVideoMode = type === "video";

  const [permissionState, setPermissionState] =
    useState<PermissionState>("checking");
  const [hasRequested, setHasRequested] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<CoachOption>("sana");

  // Audio devices
  const {
    devices: audioDevices,
    activeDeviceId: activeAudioDeviceId,
    setActiveMediaDevice: setActiveAudioDevice,
  } = useMediaDeviceSelect({
    kind: "audioinput",
    requestPermissions: false,
  });

  // Video devices
  const {
    devices: videoDevices,
    activeDeviceId: activeVideoDeviceId,
    setActiveMediaDevice: setActiveVideoDevice,
  } = useMediaDeviceSelect({
    kind: "videoinput",
    requestPermissions: false,
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
    if (isVideoMode && videoDevices.length > 0 && !activeVideoDeviceId) {
      const defaultDevice = videoDevices.find((d) =>
        d.deviceId.toLowerCase().includes("default"),
      );
      void setActiveVideoDevice(
        defaultDevice ? defaultDevice.deviceId : videoDevices[0].deviceId,
      );
    }
  }, [isVideoMode, videoDevices, activeVideoDeviceId, setActiveVideoDevice]);

  // Video preview
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isVideoMode || permissionState !== "granted") {
      // cleanup
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((t) => {
          t.stop();
        });
        videoStreamRef.current = null;
      }
      return;
    }

    let cancelled = false;

    async function setupVideo() {
      try {
        const constraints: MediaStreamConstraints = {
          video:
            activeVideoDeviceId && activeVideoDeviceId !== "default"
              ? { deviceId: { exact: activeVideoDeviceId } }
              : true,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach((t) => {
            t.stop();
          });
          return;
        }

        videoStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        console.error("Video preview error:", err);
      }
    }

    void setupVideo();

    return () => {
      cancelled = true;
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((t) => {
          t.stop();
        });
        videoStreamRef.current = null;
      }
    };
  }, [isVideoMode, permissionState, activeVideoDeviceId]);

  // Check browser permission state on mount
  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const permissionName = isVideoMode
          ? ("camera" as PermissionName)
          : ("microphone" as PermissionName);

        if (navigator.permissions) {
          try {
            const status = await navigator.permissions.query({
              name: permissionName,
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
  }, [isVideoMode]);

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
        video: isVideoMode
          ? activeVideoDeviceId && activeVideoDeviceId !== "default"
            ? { deviceId: { exact: activeVideoDeviceId } }
            : true
          : false,
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
          : isVideoMode
            ? "We couldn't access your microphone or camera."
            : "We couldn't access your microphone.";
      setDeviceError(message);
      setPermissionState("denied");
    }
  }, [activeAudioDeviceId, activeVideoDeviceId, isVideoMode]);

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
                coach: selectedCoach,
              }
            : {
                type: "PREDIAGNOSTIC",
                device_id: activeAudioDeviceId || "",
                video_device_id: isVideoMode
                  ? activeVideoDeviceId || ""
                  : undefined,
                interaction_mode: "ptt",
                coach: selectedCoach,
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
        if (isVideoMode) {
          params.set("video", "true");
        }
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
    isVideoMode,
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
            {isVideoMode
              ? "Checking microphone and camera access..."
              : "Checking microphone access..."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-5 py-8">
      <section className="mx-auto w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight">
            Get ready to join
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isVideoMode
              ? "Check your microphone and camera, then join when you're ready."
              : "Check your microphone and join when you're ready."}
          </p>
        </div>

        <div className="space-y-4">
          {/* Permission needed state */}
          {permissionState !== "granted" && (
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
                  {isVideoMode ? (
                    <Video className="size-5" />
                  ) : (
                    <Mic className="size-5" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {isVideoMode ? "Microphone & Camera" : "Microphone"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {permissionState === "denied"
                      ? "Blocked"
                      : "Permission needed"}
                  </p>
                </div>
              </div>
              <PermissionBadge state={permissionState} />
            </div>
          )}

          {/* Ready state: previews + selectors */}
          {permissionState === "granted" && (
            <div className="space-y-4">
              {/* Video setup */}
              {isVideoMode && (
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
                      {!videoRef.current?.srcObject && (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted">
                          <VideoOff className="size-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Camera</p>
                    <Select
                      value={activeVideoDeviceId || ""}
                      onValueChange={handleVideoDeviceChange}
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
              )}

              {/* Coach voice */}
              <div className="space-y-3">
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
                        onClick={() => setSelectedCoach(coach.value)}
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

                {/* Microphone setup */}
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
                    onValueChange={handleAudioDeviceChange}
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
          )}

          {deviceError ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {deviceError}
            </div>
          ) : null}

          {permissionState === "granted" ? (
            <Button
              className="w-full"
              disabled={isJoining}
              size="lg"
              onClick={handleJoin}
            >
              {isJoining ? (
                <>
                  <Spinner />
                  Joining...
                </>
              ) : (
                "Join session"
              )}
            </Button>
          ) : (
            <Button
              className="w-full"
              size="lg"
              type="button"
              onClick={requestPermission}
            >
              {hasRequested ? (
                <Spinner className="size-4" />
              ) : isVideoMode ? (
                <Camera className="size-4" />
              ) : (
                <Mic className="size-4" />
              )}
              {hasRequested
                ? ""
                : isVideoMode
                  ? "Enable microphone & camera"
                  : "Enable microphone"}
            </Button>
          )}
        </div>
      </section>
    </main>
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
