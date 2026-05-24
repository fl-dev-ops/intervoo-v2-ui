"use client";

import {
  useMediaDeviceSelect,
  usePersistentUserChoices,
  usePreviewTracks,
} from "@livekit/components-react";
import { type LocalVideoTrack, Track } from "livekit-client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PreJoinPermissionRequest } from "@/components/prejoin/prejoin-permission-request";
import { PreJoinReadyState } from "@/components/prejoin/prejoin-ready-state";
import type { CoachOption } from "@/lib/coaches";

type PermissionState = "checking" | "prompt" | "granted" | "denied";

type SessionType = "audio" | "video";
type FlowType = "prediagnostics" | "diagnostics";

interface CustomPreJoinProps {
  type?: SessionType;
  flow?: FlowType;
  roundId?: string;
  coach?: CoachOption;
  hideCoachSelection?: boolean;
  userName?: string | null;
}

export function CustomPreJoin({
  coach,
  flow = "prediagnostics",
  hideCoachSelection = false,
  roundId,
  userName,
}: CustomPreJoinProps) {
  const router = useRouter();

  const [permissionState, setPermissionState] =
    useState<PermissionState>("checking");
  const [hasRequested, setHasRequested] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<CoachOption | undefined>(
    coach ?? (hideCoachSelection ? undefined : "Sara"),
  );
  const { userChoices, saveAudioInputEnabled, saveVideoInputEnabled } =
    usePersistentUserChoices({
      defaults: { audioEnabled: true, videoEnabled: true },
    });
  const isCameraMuted = !userChoices.videoEnabled;
  const isMicMuted = !userChoices.audioEnabled;

  useEffect(() => {
    setSelectedCoach(coach ?? (hideCoachSelection ? undefined : "Sara"));
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
    console.info("[diagnostics] prejoin join clicked", {
      activeAudioDeviceId,
      activeVideoDeviceId,
      flow,
      roundId: roundId ?? null,
      selectedCoach: selectedCoach ?? null,
    });

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
        console.info("[diagnostics] prejoin connection details received", {
          roomName: data.room_name,
          roundId: roundId ?? null,
          selectedJob: data.selected_job?.title ?? null,
          sessionId: data.session_id,
        });
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
      console.info("[diagnostics] prejoin join failed", {
        error: message,
        flow,
        roundId: roundId ?? null,
      });
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
      <main className="flex min-h-dvh items-center justify-center bg-lavender">
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
      userName={userName}
      videoDevices={videoDevices}
      videoRef={videoRef}
      videoTrack={videoTrack}
      onAudioDeviceChange={handleAudioDeviceChange}
      onCameraMuteToggle={() => saveVideoInputEnabled(isCameraMuted)}
      onJoin={handleJoin}
      onMicMuteToggle={() => saveAudioInputEnabled(isMicMuted)}
      onRequestPermission={requestPermission}
      onVideoDeviceChange={handleVideoDeviceChange}
    />
  );
}
