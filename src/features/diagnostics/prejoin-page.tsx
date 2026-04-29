import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Camera, LoaderCircle, Mic, Video, VideoOff } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
  getDiagnosticJobOption,
  type DiagnosticBand,
  type DiagnosticJobOption,
} from "#/lib/diagnostics/job-options";

type DiagnosticsPrejoinPageProps = {
  band: DiagnosticBand;
  options: DiagnosticJobOption[];
};

type PermissionState = "idle" | "checking" | "ready" | "denied";

export function DiagnosticsPrejoinPage(props: DiagnosticsPrejoinPageProps) {
  const selectedOption = getDiagnosticJobOption(props.options, props.band);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<PermissionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState("default");
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState("default");

  const canContinue = state === "ready" && selectedOption;

  async function loadDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const nextAudioDevices = devices.filter((device) => device.kind === "audioinput");
    const nextVideoDevices = devices.filter((device) => device.kind === "videoinput");
    setAudioDevices(nextAudioDevices);
    setVideoDevices(nextVideoDevices);
    setSelectedAudioDeviceId((current) => current || nextAudioDevices[0]?.deviceId || "default");
    setSelectedVideoDeviceId((current) => current || nextVideoDevices[0]?.deviceId || "default");
  }

  async function requestAccess(input?: { audioDeviceId?: string; videoDeviceId?: string }) {
    setState("checking");
    setError(null);

    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const audioDeviceId = input?.audioDeviceId ?? selectedAudioDeviceId;
      const videoDeviceId = input?.videoDeviceId ?? selectedVideoDeviceId;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioDeviceId === "default" ? true : { deviceId: { exact: audioDeviceId } },
        video: videoDeviceId === "default" ? true : { deviceId: { exact: videoDeviceId } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      await loadDevices();
      setState("ready");
    } catch (accessError) {
      setState("denied");
      setError(
        accessError instanceof Error
          ? accessError.message
          : "Camera and microphone access is required.",
      );
    }
  }

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("denied");
      setError("Your browser does not support camera and microphone preview.");
      return;
    }

    async function requestInitialAccess() {
      setState("checking");
      setError(null);

      try {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        await loadDevices();
        setState("ready");
      } catch (accessError) {
        setState("denied");
        setError(
          accessError instanceof Error
            ? accessError.message
            : "Camera and microphone access is required.",
        );
      }
    }

    void requestInitialAccess();

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = micEnabled;
    });
  }, [micEnabled]);

  useEffect(() => {
    streamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = cameraEnabled;
    });

    if (cameraEnabled && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraEnabled]);

  const deviceSummary = useMemo(
    () => ({
      microphone:
        audioDevices.find((device) => device.deviceId === selectedAudioDeviceId)?.label ||
        "Default microphone",
      camera:
        videoDevices.find((device) => device.deviceId === selectedVideoDeviceId)?.label ||
        "Default camera",
    }),
    [audioDevices, selectedAudioDeviceId, selectedVideoDeviceId, videoDevices],
  );

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-[#201a2c]">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#7f768f]">Diagnostic interview</p>
            <h1 className="text-2xl font-semibold">{selectedOption?.title ?? "Selected job"}</h1>
          </div>
          <Button asChild variant="secondary">
            <Link to="/diagnostics">Change job</Link>
          </Button>
        </header>

        <section className="grid flex-1 items-center gap-6 py-8 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="overflow-hidden rounded-[1.75rem] border border-[#e5e0ed] bg-black shadow-[0_30px_80px_rgba(73,57,122,0.12)]">
            <div className="relative aspect-video">
              {cameraEnabled ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full scale-x-[-1] object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center bg-[#181126]">
                  <div className="flex flex-col items-center gap-3 text-white/70">
                    <VideoOff className="h-10 w-10" />
                    <span>Camera is off</span>
                  </div>
                </div>
              )}
              {state === "checking" ? (
                <div className="absolute inset-0 grid place-items-center bg-black/70">
                  <LoaderCircle className="h-10 w-10 animate-spin text-white" />
                </div>
              ) : null}
            </div>
          </div>

          <aside className="rounded-[1.5rem] border border-[#e5e0ed] bg-[#fbf9ff] p-6 text-[#201a2c] shadow-[0_20px_50px_rgba(73,57,122,0.1)]">
            <h2 className="text-2xl font-bold">Ready to join?</h2>
            <p className="mt-3 text-sm leading-6 text-[#70687d]">
              Check your camera and microphone before entering the diagnostic interview.
            </p>

            {error ? (
              <div className="mt-5 rounded-2xl border border-[#f1c4cc] bg-[#fff3f5] px-4 py-3 text-sm text-[#b8394f]">
                {error}
              </div>
            ) : null}

            <div className="mt-6 space-y-3">
              <DeviceSelect
                icon={<Mic className="h-5 w-5" />}
                label="Microphone"
                value={selectedAudioDeviceId}
                devices={audioDevices}
                fallbackLabel={deviceSummary.microphone}
                onChange={(deviceId) => {
                  setSelectedAudioDeviceId(deviceId);
                  void requestAccess({ audioDeviceId: deviceId });
                }}
              />
              <DeviceSelect
                icon={<Camera className="h-5 w-5" />}
                label="Camera"
                value={selectedVideoDeviceId}
                devices={videoDevices}
                fallbackLabel={deviceSummary.camera}
                onChange={(deviceId) => {
                  setSelectedVideoDeviceId(deviceId);
                  void requestAccess({ videoDeviceId: deviceId });
                }}
              />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={micEnabled ? "secondary" : "destructive"}
                className="w-full"
                onClick={() => setMicEnabled((value) => !value)}
              >
                <Mic className="h-4 w-4" />
                {micEnabled ? "Mic on" : "Mic off"}
              </Button>
              <Button
                type="button"
                variant={cameraEnabled ? "secondary" : "destructive"}
                className="w-full"
                onClick={() => setCameraEnabled((value) => !value)}
              >
                <Video className="h-4 w-4" />
                {cameraEnabled ? "Camera on" : "Camera off"}
              </Button>
            </div>

            <Button
              asChild={Boolean(canContinue)}
              disabled={!canContinue}
              size="lg"
              className="mt-8 w-full"
            >
              {canContinue ? (
                <Link to="/diagnostics/session" search={{ band: selectedOption.band }}>
                  Join interview
                </Link>
              ) : (
                <span>Join interview</span>
              )}
            </Button>
            {state === "denied" ? (
              <Button
                variant="outline"
                className="mt-3 w-full"
                type="button"
                onClick={requestAccess}
              >
                Retry access
              </Button>
            ) : null}
          </aside>
        </section>
      </div>
    </main>
  );
}

function DeviceSelect(props: {
  icon: ReactNode;
  label: string;
  value: string;
  devices: MediaDeviceInfo[];
  fallbackLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#ece7f2] bg-[#faf8fd] px-4 py-3">
      <span className="shrink-0 text-[#6A4DF5]">{props.icon}</span>
      <label className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-[#7f768f]">{props.label}</span>
        <select
          className="mt-1 w-full bg-transparent text-sm font-medium text-[#201a2c] outline-none"
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
        >
          <option value="default">Default {props.label.toLowerCase()}</option>
          {props.devices.length ? (
            props.devices.map((device, index) => (
              <option key={device.deviceId || index} value={device.deviceId || "default"}>
                {device.label || `${props.label} ${index + 1}`}
              </option>
            ))
          ) : (
            <option disabled value="unavailable">
              {props.fallbackLabel}
            </option>
          )}
        </select>
      </label>
    </div>
  );
}
