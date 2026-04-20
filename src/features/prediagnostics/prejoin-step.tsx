import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useMediaDevices,
  usePersistentUserChoices,
  usePreviewTracks,
  Track,
  type LocalUserChoices,
} from "#/shared/livekit";
import { LoaderCircle, Mic, RefreshCcw } from "lucide-react";
import { Button } from "#/components/ui/button";
import { LiveWaveform } from "#/components/ui/live-waveform";
import { MicSelector, type AudioDevice } from "#/components/ui/mic-selector";
import type { PrediagnosticsConnectionDetails } from "#/lib/livekit/prediagnostics";

type MicPermissionState = "checking" | "prompt" | "granted" | "denied";

const DEFAULT_USER_CHOICES: Partial<LocalUserChoices> = {
  audioEnabled: true,
  audioDeviceId: "default",
  videoEnabled: false,
  videoDeviceId: "default",
  username: "",
};

type PrediagnosticsPrejoinStepProps = {
  onStarted: (payload: {
    sessionId: string;
    connectionDetails: PrediagnosticsConnectionDetails;
  }) => void;
};

async function startPrediagnosticsSession(): Promise<PrediagnosticsConnectionDetails> {
  const response = await fetch("/api/prediagnostics/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const errorMessage =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Failed to create LiveKit connection details";

    throw new Error(errorMessage);
  }

  return (await response.json()) as PrediagnosticsConnectionDetails;
}

export function PrediagnosticsPrejoinStep(props: PrediagnosticsPrejoinStepProps) {
  const [permissionState, setPermissionState] = useState<MicPermissionState>("checking");
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const { userChoices, saveAudioInputDeviceId, saveAudioInputEnabled } = usePersistentUserChoices({
    defaults: DEFAULT_USER_CHOICES,
  });

  const audioDevices = useMediaDevices({ kind: "audioinput" });
  const selectedDeviceId = userChoices.audioDeviceId || "default";
  const audioEnabled = userChoices.audioEnabled ?? true;
  const selectorDevices = useMemo<AudioDevice[]>(
    () =>
      audioDevices.map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Microphone ${index + 1}`,
        groupId: device.groupId,
      })),
    [audioDevices],
  );

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
    async (nextDeviceId: string) => {
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
    setJoinError(null);

    try {
      const connectionDetails = await startPrediagnosticsSession();
      props.onStarted({
        sessionId: connectionDetails.sessionId,
        connectionDetails,
      });
    } catch (error) {
      setJoinError(
        error instanceof Error ? error.message : "Failed to start the pre-diagnostic session.",
      );
    } finally {
      setIsJoining(false);
    }
  }, [permissionState, props]);

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
      <div className="hidden min-h-screen md:flex md:items-center md:justify-center md:px-6">
        <div className="relative">
          <div
            className="absolute -inset-2 rounded-4xl blur-xl opacity-60"
            style={{
              background:
                "linear-gradient(168.19deg, #7A2CAF -0.95%, #41D69A 26.72%, #DFCF58 60.2%, #5350B4 91.75%)",
            }}
          />
          <div className="relative z-10 w-full max-w-105 overflow-hidden rounded-[26px] bg-white shadow-[0_28px_60px_rgba(74,57,143,0.12)]">
            <div className="flex h-190 flex-col justify-between p-4 pt-6">
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
                <PrejoinDeviceSelector
                  disabled={permissionState !== "granted" || audioDevices.length === 0}
                  devices={selectorDevices}
                  permissionState={permissionState}
                  selectedDeviceAvailable={selectedDeviceAvailable}
                  selectedDeviceId={selectedDeviceId}
                  onChange={handleDeviceChange}
                />

                <PrejoinErrors deviceError={deviceError} joinError={joinError} />

                <PrejoinActionButton
                  hasRequestedPermission={hasRequestedPermission}
                  isJoining={isJoining}
                  permissionState={permissionState}
                  readyToJoin={!!previewAudioTrack}
                  onJoin={handleJoin}
                  onRequestPermission={requestPermission}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden">
        <div className="mx-auto flex min-h-screen md:min-h-[calc(100dvh-4rem)] w-full flex-col items-center justify-between">
          <section className="w-full max-w-xl rounded-4xl p-4 sm:p-4">
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[#2b2233]">
              Get ready to join the session
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-[#7f768f] sm:text-base">
              Check your microphone, choose the input device you want to use, and join when
              you&apos;re ready.
            </p>
          </section>
          <div className="w-full mt-8 p-4 sm:p-8">
            <div className="mt-5 space-y-4">
              <PrejoinDeviceSelector
                disabled={permissionState !== "granted" || audioDevices.length === 0}
                devices={selectorDevices}
                permissionState={permissionState}
                selectedDeviceAvailable={selectedDeviceAvailable}
                selectedDeviceId={selectedDeviceId}
                onChange={handleDeviceChange}
              />

              <PrejoinErrors deviceError={deviceError} joinError={joinError} />

              <PrejoinActionButton
                hasRequestedPermission={hasRequestedPermission}
                isJoining={isJoining}
                permissionState={permissionState}
                readyToJoin={!!previewAudioTrack}
                onJoin={handleJoin}
                onRequestPermission={requestPermission}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrejoinDeviceSelector(props: {
  disabled: boolean;
  devices: AudioDevice[];
  permissionState: MicPermissionState;
  selectedDeviceAvailable: boolean;
  selectedDeviceId: string;
  onChange: (deviceId: string) => void;
}) {
  const selectorValue = props.selectedDeviceAvailable
    ? props.selectedDeviceId
    : (props.devices[0]?.deviceId ?? "default");
  const waveformActive = props.permissionState === "granted" && !props.disabled;

  return (
    <div className="space-y-3">
      <div className="mb-2 flex justify-between">
        <label className="mb-2 block text-sm font-medium text-[#2b2233]">Device</label>
        <PermissionBadge permissionState={props.permissionState} />
      </div>

      <div className="overflow-hidden rounded-xl border border-[#e4d8f1] bg-white shadow-[0_8px_24px_rgba(111,82,184,0.06)]">
        {props.permissionState === "granted" ? (
          <div className="bg-[#faf7fd] px-5 py-4">
            <LiveWaveform
              active={waveformActive}
              deviceId={selectorValue === "default" ? undefined : selectorValue}
              mode="scrolling"
              height={44}
              barWidth={3}
              barGap={2}
              className="w-full"
            />
          </div>
        ) : null}
        <div className="mx-5 border-t border-[#ede3f6]" />
        <div className="p-2">
          <MicSelector
            value={selectorValue}
            devices={props.devices}
            disabled={props.disabled}
            loading={false}
            error={null}
            showMuteControl={false}
            showWaveformPreview={false}
            className="h-13 w-full justify-start rounded-[22px] border-0 bg-transparent px-3 text-sm text-[#2b2233] shadow-none hover:bg-[#f8f5fc]"
            onValueChange={props.onChange}
          />
        </div>
      </div>
    </div>
  );
}

function PrejoinErrors(props: { deviceError: string | null; joinError: string | null }) {
  if (!props.deviceError && !props.joinError) {
    return null;
  }

  return (
    <div className="space-y-3">
      {props.deviceError ? (
        <div className="rounded-2xl border border-[#f1d1d5] bg-[#fff7f8] px-4 py-3 text-sm text-[#a03d4d]">
          {props.deviceError}
        </div>
      ) : null}
      {props.joinError ? (
        <div className="rounded-2xl border border-[#f1d1d5] bg-[#fff7f8] px-4 py-3 text-sm text-[#a03d4d]">
          {props.joinError}
        </div>
      ) : null}
    </div>
  );
}

function PrejoinActionButton(props: {
  hasRequestedPermission: boolean;
  isJoining: boolean;
  permissionState: MicPermissionState;
  readyToJoin: boolean;
  onJoin: () => void;
  onRequestPermission: () => void;
}) {
  return (
    <div className="mt-6 space-y-3">
      {props.permissionState === "granted" ? (
        <Button
          size={"lg"}
          className="w-full"
          disabled={props.isJoining || !props.readyToJoin}
          type="button"
          onClick={props.onJoin}
        >
          {props.isJoining ? <LoaderCircle className="h-5 w-5 animate-spin" /> : "Join session"}
        </Button>
      ) : (
        <Button size={"lg"} className="w-full" type="button" onClick={props.onRequestPermission}>
          {props.hasRequestedPermission ? (
            <RefreshCcw className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          {props.hasRequestedPermission ? "Try microphone again" : "Enable microphone"}
        </Button>
      )}
    </div>
  );
}

function PermissionBadge(props: { permissionState: MicPermissionState }) {
  const label =
    props.permissionState === "granted"
      ? "Ready"
      : props.permissionState === "denied"
        ? "Blocked"
        : "Pending";
  const className =
    props.permissionState === "granted"
      ? "bg-[#edf9f0] text-[#2d8a4b]"
      : props.permissionState === "denied"
        ? "bg-[#fff0f2] text-[#b64b5c]"
        : "bg-[#f3eefb] text-[#6e667b]";

  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${className}`}>{label}</span>;
}
