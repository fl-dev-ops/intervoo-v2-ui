import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CameraOff,
  CheckCircle2,
  LoaderCircle,
  Mic,
  MicOff,
  Play,
  Video,
} from "lucide-react";
import { Button } from "#/components/ui/button";
import {
  getDiagnosticJobOption,
  type DiagnosticBand,
  type DiagnosticJobOption,
} from "#/lib/diagnostics/job-options";
import type { DiagnosticsConnectionDetails } from "#/lib/livekit/diagnostics";

type DiagnosticsPrejoinPageProps = {
  band: DiagnosticBand;
  options: DiagnosticJobOption[];
  onBack: () => void;
  onStarted: (connectionDetails: DiagnosticsConnectionDetails) => void;
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
  const [isStarting, setIsStarting] = useState(false);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState("default");
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState("default");

  const canContinue = state === "ready" && selectedOption;

  async function loadDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const nextAudioDevices = devices.filter((device) => device.kind === "audioinput");
    const nextVideoDevices = devices.filter((device) => device.kind === "videoinput");
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
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
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

  const bandLabel = selectedOption?.label.replace("Job", "Band") ?? "Selected Band";

  async function startSession() {
    if (!selectedOption || isStarting) {
      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch("/api/diagnostics/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ band: selectedOption.band }),
      });
      const payload = (await response.json().catch(() => null)) as
        | DiagnosticsConnectionDetails
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload && "error" in payload && payload.error
            ? payload.error
            : "Failed to start diagnostic session.",
        );
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      props.onStarted(payload as DiagnosticsConnectionDetails);
    } catch (startError) {
      setError(
        startError instanceof Error ? startError.message : "Failed to start diagnostic session.",
      );
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f6fb] px-4 py-6 text-[#201a2c] sm:px-6 lg:py-8">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-5xl flex-col items-center">
        <header className="text-center">
          <img alt="Intervoo" className="mx-auto h-12 w-24" src="/intervoo-logo.svg" />
          <h1 className="mt-5 text-xl font-semibold tracking-[-0.02em] text-[#13101b]">
            Ready to begin your interview?
          </h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-5 text-[#777082]">
            You&apos;ll have a video conversation with Sara, your AI interviewer.
          </p>
        </header>

        <section className="mt-8 grid w-full max-w-4xl overflow-hidden rounded-[1.5rem] bg-white shadow-[0_20px_60px_rgba(70,55,115,0.1)] lg:grid-cols-[1.05fr_1fr]">
          <div className="relative min-h-[340px] overflow-hidden bg-black sm:min-h-[420px] lg:min-h-[500px]">
            <Button
              aria-label="Back to job selection"
              className="absolute top-4 left-4 z-10 h-9 w-9 bg-black/20 text-white backdrop-blur-md hover:bg-black/30"
              size="icon"
              type="button"
              variant="ghost"
              onClick={props.onBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            {cameraEnabled ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full scale-x-[-1] object-cover"
              />
            ) : (
              <div className="grid h-full min-h-[340px] place-items-center bg-black text-white/80 sm:min-h-[420px] lg:min-h-[500px]">
                <p className="text-sm">Camera is off</p>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-5 flex justify-center">
              <div className="flex items-center gap-2 rounded-full bg-black/35 p-1.5 shadow-[0_12px_30px_rgba(0,0,0,0.2)] backdrop-blur-xl">
                <MediaToggle
                  active={cameraEnabled}
                  activeIcon={<Video className="h-4 w-4" />}
                  inactiveIcon={<CameraOff className="h-4 w-4" />}
                  label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
                  onClick={() => setCameraEnabled((value) => !value)}
                />
                <MediaToggle
                  active={micEnabled}
                  activeIcon={<Mic className="h-4 w-4" />}
                  inactiveIcon={<MicOff className="h-4 w-4" />}
                  label={micEnabled ? "Mute microphone" : "Unmute microphone"}
                  onClick={() => setMicEnabled((value) => !value)}
                />
              </div>
            </div>
            {state === "checking" ? (
              <div className="absolute inset-0 grid place-items-center bg-black/35">
                <LoaderCircle className="h-8 w-8 animate-spin text-white" />
              </div>
            ) : null}
          </div>

          <aside className="flex flex-col gap-4 p-4 sm:p-5 lg:p-6">
            <div className="rounded-[1rem] border border-[#e9e4ef] bg-white p-4 shadow-[0_6px_18px_rgba(40,31,55,0.07)]">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-[#d49a42] uppercase">
                  {bandLabel}
                </p>
                {selectedOption ? (
                  <span className="rounded-full border border-[#f1e6df] bg-[#fffaf7] px-3 py-1.5 text-sm font-semibold text-[#13101b]">
                    {selectedOption.salary}
                  </span>
                ) : null}
              </div>

              <h2 className="mt-4 text-base font-semibold tracking-[-0.01em] text-[#13101b]">
                {selectedOption?.title ?? "Selected job"}
              </h2>
              <p className="mt-2 text-sm leading-5 text-[#777082]">
                {selectedOption?.description ??
                  "Your selected diagnostic band will be used for this interview."}
              </p>

              {selectedOption?.companies.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedOption.companies.map((company) => (
                    <span
                      className="rounded-full bg-[#fff4e7] px-2.5 py-1 text-xs text-[#3b3143]"
                      key={company}
                    >
                      {company}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-[1rem] border border-[#e9e4ef] bg-white p-4 shadow-[0_6px_18px_rgba(40,31,55,0.07)]">
              <p className="text-sm font-medium text-[#777082]">Make sure you will have</p>
              <div className="mt-3 space-y-2.5">
                <ChecklistItem>Quiet space</ChecklistItem>
                <ChecklistItem>Good light</ChecklistItem>
                <ChecklistItem>Stable internet connectivity</ChecklistItem>
              </div>
            </div>

            <div className="rounded-[1rem] border border-[#f2e7aa] bg-[#fffbdf] px-3.5 py-3 text-sm leading-5 text-[#756f62]">
              <div className="flex gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#d6a929]" />
                <p>
                  Session <span className="font-semibold text-[#c58a23]">cannot be paused.</span>{" "}
                  ~15 mins. Camera stays on throughout. Do not close this tab.
                </p>
              </div>
            </div>

            {error ? (
              <div className="rounded-[1rem] border border-[#f1c4cc] bg-[#fff3f5] px-3.5 py-3 text-sm text-[#b8394f]">
                {error}
              </div>
            ) : null}

            <Button
              disabled={!canContinue || isStarting}
              className="mt-auto h-11 w-full text-sm"
              type="button"
              onClick={startSession}
            >
              {isStarting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}
              {isStarting ? "Starting..." : "Begin Video interview"}
            </Button>

            {state === "denied" ? (
              <Button variant="secondary" className="w-full" type="button" onClick={requestAccess}>
                Retry camera and mic access
              </Button>
            ) : null}
          </aside>
        </section>
      </div>
    </main>
  );
}

function ChecklistItem(props: { children: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm font-medium text-[#2b2233]">
      <CheckCircle2 className="h-4.5 w-4.5 shrink-0 fill-[#75d18f] text-white" />
      <span>{props.children}</span>
    </div>
  );
}

function MediaToggle(props: {
  active: boolean;
  activeIcon: ReactNode;
  inactiveIcon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={props.label}
      className={
        props.active
          ? "grid h-11 w-11 place-items-center rounded-full bg-white text-[#2b2233] shadow-[0_6px_14px_rgba(0,0,0,0.16)] transition hover:bg-[#f8f5fc]"
          : "grid h-11 w-11 place-items-center rounded-full bg-[#e45658] text-white shadow-[0_6px_14px_rgba(153,35,48,0.22)] transition hover:bg-[#d8474b]"
      }
      type="button"
      onClick={props.onClick}
    >
      {props.active ? props.activeIcon : props.inactiveIcon}
    </button>
  );
}
