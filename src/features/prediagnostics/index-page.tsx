import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useMediaDevices,
  usePersistentUserChoices,
  usePreviewTracks,
  type LocalUserChoices,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { LoaderCircle, Mic, RefreshCcw } from "lucide-react";

type MicPermissionState = "checking" | "prompt" | "granted" | "denied";

const DEFAULT_USER_CHOICES: Partial<LocalUserChoices> = {
  audioEnabled: true,
  audioDeviceId: "default",
  videoEnabled: false,
  videoDeviceId: "default",
  username: "",
};

export function PrediagnosticsIndexPage() {
  const [permissionState, setPermissionState] = useState<MicPermissionState>("checking");
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  const { userChoices, saveAudioInputDeviceId, saveAudioInputEnabled } = usePersistentUserChoices({
    defaults: DEFAULT_USER_CHOICES,
  });

  const audioDevices = useMediaDevices({ kind: "audioinput" });

  const selectedDeviceId = userChoices.audioDeviceId || "default";
  const audioEnabled = userChoices.audioEnabled ?? true;

  const previewTracks = usePreviewTracks(
    {
      audio:
        permissionState === "granted" && audioEnabled
          ? selectedDeviceId === "default"
            ? true
            : { deviceId: selectedDeviceId }
          : false,
      video: false,
    },
    (error) => {
      setDeviceError(error.message);
    },
  );

  const previewAudioTrack = useMemo(() => {
    return previewTracks?.find((track) => track.kind === Track.Kind.Audio);
  }, [previewTracks]);

  const selectedDeviceAvailable = audioDevices.some(
    (device) => device.deviceId === selectedDeviceId,
  );

  useEffect(() => {
    let cancelled = false;

    async function checkPermission() {
      try {
        if (navigator.permissions) {
          try {
            const result = await navigator.permissions.query({
              name: "microphone" as PermissionName,
            });

            if (cancelled) {
              return;
            }

            if (result.state === "granted") {
              setPermissionState("granted");
              return;
            }

            if (result.state === "denied") {
              setPermissionState("denied");
              return;
            }

            setPermissionState("prompt");
            return;
          } catch {
            // Some browsers don't support permission querying for microphones.
          }
        }

        if (!cancelled) {
          setPermissionState("prompt");
        }
      } catch {
        if (!cancelled) {
          setPermissionState("prompt");
        }
      }
    }

    void checkPermission();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!audioDevices.length) {
      return;
    }

    if (selectedDeviceId !== "default" && selectedDeviceAvailable) {
      return;
    }

    const defaultNamedDevice = audioDevices.find((device) => device.deviceId === "default");
    const nextDevice = defaultNamedDevice ?? audioDevices[0];

    if (!nextDevice) {
      return;
    }

    saveAudioInputDeviceId(nextDevice.deviceId);
  }, [audioDevices, saveAudioInputDeviceId, selectedDeviceAvailable, selectedDeviceId]);

  const requestPermission = useCallback(async () => {
    setHasRequestedPermission(true);
    setDeviceError(null);

    try {
      const deviceIdConstraint =
        selectedDeviceId !== "default" ? { exact: selectedDeviceId } : undefined;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceIdConstraint ? { deviceId: deviceIdConstraint } : true,
      });
      stream.getTracks().forEach((track) => track.stop());
      saveAudioInputEnabled(true);
      setPermissionState("granted");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "We couldn't access your microphone.";
      setDeviceError(message);
      setPermissionState("denied");
    }
  }, [saveAudioInputEnabled, selectedDeviceId]);

  const handleDeviceChange = useCallback(
    async (event: React.ChangeEvent<HTMLSelectElement>) => {
      const nextDeviceId = event.target.value;
      saveAudioInputDeviceId(nextDeviceId);
      setDeviceError(null);

      if (permissionState !== "granted") {
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: nextDeviceId === "default" ? true : { deviceId: { exact: nextDeviceId } },
        });
        stream.getTracks().forEach((track) => track.stop());
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "We couldn't switch to that microphone.";
        setDeviceError(message);
      }
    },
    [permissionState, saveAudioInputDeviceId],
  );

  const handleJoin = useCallback(async () => {
    if (permissionState !== "granted") {
      return;
    }

    setIsJoining(true);
    window.location.href = "/prediagnostics/session";
  }, [permissionState]);

  if (permissionState === "checking") {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F5F3F7]">
        <div className="flex flex-col items-center gap-3">
          <LoaderCircle className="h-8 w-8 animate-spin text-[#5a42cc]" />
          <p className="text-sm text-[#7f768f]">Checking microphone access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F3F7]">
      {/* Desktop: phone preview with gradient glow */}
      <div className="hidden min-h-screen md:flex md:items-center md:justify-center md:px-6">
        <div className="relative">
          <div
            className="absolute -inset-2 rounded-4xl blur-xl opacity-60"
            style={{
              background:
                "linear-gradient(168.19deg, #7A2CAF -0.95%, #41D69A 26.72%, #DFCF58 60.2%, #5350B4 91.75%)",
            }}
          />
          <div className="relative z-10 w-full max-w-105 rounded-[26px] bg-white overflow-hidden shadow-[0_28px_60px_rgba(74,57,143,0.12)]">
            <div className="flex h-190 flex-col justify-between px-8 py-10">
              <div>
                <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#2b2233]">
                  Get ready to join the session
                </h1>
                <p className="mt-3 text-sm leading-6 text-[#7f768f]">
                  Check your microphone, choose the input device you want to use, and join when
                  you&apos;re ready.
                </p>
              </div>

              <div className="mt-8 space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <label
                      className="mb-2 block text-sm font-medium text-[#2b2233]"
                      htmlFor="prediagnostics-audio-device-desktop"
                    >
                      Device
                    </label>
                    <PermissionBadge permissionState={permissionState} />
                  </div>
                  <select
                    className="h-12 w-full rounded-2xl border border-mauve-500 bg-white px-4 text-sm text-[#2b2233] outline-none transition focus:border-[#5a42cc] disabled:cursor-not-allowed disabled:bg-[#f6f3fa] disabled:text-[#9b92ad]"
                    disabled={permissionState !== "granted" || audioDevices.length === 0}
                    id="prediagnostics-audio-device-desktop"
                    value={
                      selectedDeviceAvailable
                        ? selectedDeviceId
                        : (audioDevices[0]?.deviceId ?? "default")
                    }
                    onChange={handleDeviceChange}
                  >
                    {audioDevices.map((device, index) => (
                      <option
                        key={device.deviceId || `${device.label}-${index}`}
                        value={device.deviceId}
                      >
                        {device.label || `Microphone ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                {deviceError ? (
                  <div className="rounded-2xl border border-[#f1d1d5] bg-[#fff7f8] px-4 py-3 text-sm text-[#a03d4d]">
                    {deviceError}
                  </div>
                ) : null}

                <div className="mt-6 space-y-3">
                  {permissionState === "granted" ? (
                    <button
                      className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(90deg,#4F33A3_0%,#6A4DF5_100%)] px-6 text-sm font-medium text-white shadow-[0_14px_28px_rgba(93,72,220,0.25)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isJoining || !previewAudioTrack}
                      type="button"
                      onClick={() => void handleJoin()}
                    >
                      {isJoining ? (
                        <LoaderCircle className="h-5 w-5 animate-spin" />
                      ) : (
                        "Join session"
                      )}
                    </button>
                  ) : (
                    <button
                      className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(90deg,#4F33A3_0%,#6A4DF5_100%)] px-6 text-sm font-medium text-white shadow-[0_14px_28px_rgba(93,72,220,0.25)] transition hover:opacity-95"
                      type="button"
                      onClick={() => void requestPermission()}
                    >
                      {hasRequestedPermission ? (
                        <RefreshCcw className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                      {hasRequestedPermission ? "Try microphone again" : "Enable microphone"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: current layout */}
      <div className="md:hidden">
        <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full items-center justify-center">
          <section className="w-full max-w-xl rounded-4xl p-6 sm:p-8">
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[#2b2233]">
              Get ready to join the session
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-[#7f768f] sm:text-base">
              Check your microphone, choose the input device you want to use, and join when
              you&apos;re ready.
            </p>

            <div className="mt-8">
              <div className="mt-5 space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <label
                      className="mb-2 block text-sm font-medium text-[#2b2233]"
                      htmlFor="prediagnostics-audio-device"
                    >
                      Device
                    </label>
                    <PermissionBadge permissionState={permissionState} />
                  </div>
                  <select
                    className="h-12 w-full rounded-2xl border border-[#dcd4e7] bg-white px-4 text-sm text-[#2b2233] outline-none transition focus:border-[#5a42cc] disabled:cursor-not-allowed disabled:bg-[#f6f3fa] disabled:text-[#9b92ad]"
                    disabled={permissionState !== "granted" || audioDevices.length === 0}
                    id="prediagnostics-audio-device"
                    value={
                      selectedDeviceAvailable
                        ? selectedDeviceId
                        : (audioDevices[0]?.deviceId ?? "default")
                    }
                    onChange={handleDeviceChange}
                  >
                    {audioDevices.map((device, index) => (
                      <option
                        key={device.deviceId || `${device.label}-${index}`}
                        value={device.deviceId}
                      >
                        {device.label || `Microphone ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                {deviceError ? (
                  <div className="rounded-2xl border border-[#f1d1d5] bg-[#fff7f8] px-4 py-3 text-sm text-[#a03d4d]">
                    {deviceError}
                  </div>
                ) : null}

                <div className="mt-6 space-y-3">
                  {permissionState === "granted" ? (
                    <button
                      className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(90deg,#4F33A3_0%,#6A4DF5_100%)] px-6 text-sm font-medium text-white shadow-[0_14px_28px_rgba(93,72,220,0.25)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isJoining || !previewAudioTrack}
                      type="button"
                      onClick={() => void handleJoin()}
                    >
                      {isJoining ? (
                        <LoaderCircle className="h-5 w-5 animate-spin" />
                      ) : (
                        "Join session"
                      )}
                    </button>
                  ) : (
                    <button
                      className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(90deg,#4F33A3_0%,#6A4DF5_100%)] px-6 text-sm font-medium text-white shadow-[0_14px_28px_rgba(93,72,220,0.25)] transition hover:opacity-95"
                      type="button"
                      onClick={() => void requestPermission()}
                    >
                      {hasRequestedPermission ? (
                        <RefreshCcw className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                      {hasRequestedPermission ? "Try microphone again" : "Enable microphone"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function PermissionBadge({ permissionState }: { permissionState: MicPermissionState }) {
  const copy =
    permissionState === "granted"
      ? "Ready"
      : permissionState === "denied"
        ? "Blocked"
        : "Needs access";

  const className =
    permissionState === "granted"
      ? "bg-[#eaf7ee] text-[#237a44]"
      : permissionState === "denied"
        ? "bg-[#fff1f3] text-[#b24152]"
        : "bg-[#f3eefb] text-[#5a42cc]";

  return (
    <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {copy}
    </div>
  );
}
