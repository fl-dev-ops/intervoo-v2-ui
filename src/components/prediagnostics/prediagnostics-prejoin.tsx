"use client";

import { useMediaDeviceSelect } from "@livekit/components-react";
import { IconMicrophone } from "@tabler/icons-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LiveWaveform } from "@/components/ui/live-waveform";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

type PermissionState = "checking" | "prompt" | "granted" | "denied";

export function PrediagnosticsPreJoin() {
  const router = useRouter();

  const [permissionState, setPermissionState] =
    useState<PermissionState>("checking");
  const [hasRequested, setHasRequested] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const {
    devices: audioDevices,
    activeDeviceId: activeAudioDeviceId,
    setActiveMediaDevice: setActiveAudioDevice,
  } = useMediaDeviceSelect({
    kind: "audioinput",
    requestPermissions: permissionState === "granted",
  });

  useEffect(() => {
    if (audioDevices.length > 0 && !activeAudioDeviceId) {
      const defaultDevice = audioDevices.find((device) =>
        device.deviceId.toLowerCase().includes("default"),
      );
      void setActiveAudioDevice(
        defaultDevice ? defaultDevice.deviceId : audioDevices[0].deviceId,
      );
    }
  }, [audioDevices, activeAudioDeviceId, setActiveAudioDevice]);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        if (navigator.permissions) {
          try {
            const status = await navigator.permissions.query({
              name: "microphone" as PermissionName,
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
            // Some browsers don't support microphone permission querying.
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

  const requestPermission = useCallback(async () => {
    setHasRequested(true);
    setDeviceError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio:
          activeAudioDeviceId && activeAudioDeviceId !== "default"
            ? { deviceId: { exact: activeAudioDeviceId } }
            : true,
      });
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      setPermissionState("granted");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "We couldn't access your microphone.";
      setDeviceError(message);
      setPermissionState("denied");
    }
  }, [activeAudioDeviceId]);

  const handleAudioDeviceChange = useCallback(
    (deviceId: string | null) => {
      if (!deviceId) return;
      void setActiveAudioDevice(deviceId);
    },
    [setActiveAudioDevice],
  );

  const handleJoin = useCallback(async () => {
    setIsJoining(true);
    setDeviceError(null);
    console.info("[diagnostics] prejoin join clicked", {
      activeAudioDeviceId,
      flow: "prediagnostics",
    });

    try {
      const response = await fetch("/api/livekit/connection-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "PREDIAGNOSTIC",
          device_id: activeAudioDeviceId || "",
          interaction_mode: "ptt",
        }),
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

      const params = new URLSearchParams({
        token: data.participant_token,
        url: data.server_url,
        room: data.room_name,
        session: data.session_id,
      });
      if (data.interaction_mode) {
        params.set("mode", data.interaction_mode);
      }
      router.push(`/prediagnostics/session?${params.toString()}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to join session.";
      console.info("[diagnostics] prejoin join failed", {
        error: message,
        flow: "prediagnostics",
      });
      setDeviceError(message);
      setIsJoining(false);
    }
  }, [activeAudioDeviceId, router]);

  const selectedAudioLabel =
    audioDevices.find((device) => device.deviceId === activeAudioDeviceId)
      ?.label || "Select microphone";

  if (permissionState === "checking") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="size-8 text-[#6548E4]" />
          <p className="text-sm text-slate-600">
            Checking microphone access...
          </p>
        </div>
      </main>
    );
  }

  if (!hasRequested && permissionState !== "granted") {
    return (
      <MicPermissionRequest
        deviceError={deviceError}
        onRequestPermission={requestPermission}
      />
    );
  }

  return (
    <main className="flex min-h-dvh bg-white px-5 py-8">
      <section className="mx-auto flex w-full max-w-md flex-col justify-center space-y-8">
        <div className="space-y-3 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-slate-950">
            Get ready to join the session
          </h1>
          <p className="text-sm leading-6 text-slate-500">
            Check your microphone, choose the input device you want to use, and
            join when you are ready.
          </p>
        </div>

        <div className="space-y-5">
          <div className="h-12 overflow-hidden rounded-lg bg-[#F0EDF6] p-3">
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
              className="w-full text-[#6548E4]"
            />
          </div>

          <Select
            value={activeAudioDeviceId || ""}
            onValueChange={handleAudioDeviceChange}
          >
            <SelectTrigger className="h-auto w-full rounded-lg border-0 bg-[#F0EDF6] px-3 py-3 font-normal text-[#24232A] shadow-none focus-visible:border-0 focus-visible:ring-3 focus-visible:ring-[#6548E4]/20 data-placeholder:text-slate-400">
              <IconMicrophone className="mr-2 size-4 shrink-0 text-slate-500" />
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

        {deviceError ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {deviceError}
          </div>
        ) : null}

        <Button
          className="h-12 w-full rounded-full bg-button text-sm font-semibold text-white shadow-lg shadow-[#6548E4]/20 hover:opacity-95"
          disabled={isJoining}
          type="button"
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
      </section>
    </main>
  );
}

function MicPermissionRequest({
  deviceError,
  onRequestPermission,
}: {
  deviceError: string | null;
  onRequestPermission: () => void;
}) {
  return (
    <main className="flex min-h-dvh bg-white px-5 py-8">
      <section className="mx-auto flex w-full max-w-md flex-col justify-center space-y-8">
        <div className="space-y-4 text-center">
          <div className="relative mx-auto h-64 w-full max-w-72">
            <Image
              priority
              alt="Person preparing for access permissions"
              className="object-contain"
              fill
              sizes="288px"
              src="/pre-join-access.svg"
            />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-slate-950">
              Allow microphone access
            </h1>
            <p className="text-sm leading-6 text-slate-500">
              Your microphone helps us conduct the pre-diagnostic conversation
              and understand your responses clearly.
            </p>
          </div>
        </div>

        {deviceError ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {deviceError}
          </div>
        ) : null}

        <Button
          className="h-12 w-full rounded-full bg-button text-sm font-semibold text-white shadow-lg shadow-[#6548E4]/20 hover:opacity-95"
          type="button"
          onClick={onRequestPermission}
        >
          <IconMicrophone className="size-4" />
          Allow access and continue
        </Button>
      </section>
    </main>
  );
}
