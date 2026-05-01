import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, MicOff, PhoneOff, VideoOff } from "lucide-react";
import { AgentAudioVisualizerAura } from "#/components/agents-ui/agent-audio-visualizer-aura";
import { AgentAudioVisualizerBar } from "#/components/agents-ui/agent-audio-visualizer-bar";
import { Button } from "#/components/ui/button";
import { Track, usePreviewTracks } from "#/shared/livekit";
import {
  getDiagnosticJobOption,
  type DiagnosticBand,
  type DiagnosticJobOption,
} from "#/lib/diagnostics/job-options";

type DiagnosticsSessionPageProps = {
  band: DiagnosticBand;
  options: DiagnosticJobOption[];
};

const MOCK_USER_ANSWER =
  "I built a full-stack application where I handled both frontend and backend. I designed the APIs, worked with the";

export function DiagnosticsSessionPage(props: DiagnosticsSessionPageProps) {
  const selectedOption = getDiagnosticJobOption(props.options, props.band);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(5 * 60 + 45);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const previewTracks = usePreviewTracks({
    audio: true,
    video: cameraEnabled,
  });

  const previewVideoTrack = useMemo(
    () => previewTracks?.find((track) => track.kind === Track.Kind.Video),
    [previewTracks],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!videoRef.current || !previewVideoTrack) {
      return;
    }

    const videoElement = videoRef.current;
    previewVideoTrack.attach(videoElement);

    return () => {
      previewVideoTrack.detach(videoElement);
    };
  }, [previewVideoTrack]);

  return (
    <main className="h-screen max-h-screen overflow-hidden bg-[#150d38] text-white">
      <div className="relative flex h-full flex-col overflow-hidden bg-[radial-gradient(circle_at_center,#211052_0%,#160c3a_44%,#11072c_100%)]">
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(circle,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:14px_14px]" />

        <header className="relative z-10 flex items-center justify-between px-6 py-5">
          <div className="flex min-w-0 items-center gap-4">
            <Button
              asChild
              aria-label="Back to diagnostics"
              className="h-9 w-9 bg-transparent text-white shadow-none hover:bg-white/10"
              size="icon"
              variant="ghost"
            >
              <Link to="/diagnostics/prejoin" search={{ band: selectedOption?.band ?? props.band }}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="line-clamp-1 text-base font-semibold tracking-[-0.01em] text-white">
              Diagnostic Interview - {selectedOption?.title ?? "Selected job"}
            </h1>
          </div>

          <Button
            asChild
            variant={"destructive"}
            aria-label="End interview"
            className="h-13 w-28 rounded-full bg-[#f26f6f]! text-white shadow-none hover:bg-[#ea6262]!"
            size="icon"
          >
            <Link to="/diagnostics/report" search={{ band: selectedOption?.band ?? props.band }}>
              <PhoneOff className="h-6 w-6" />
            </Link>
          </Button>
        </header>

        <button
          aria-label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
          className="group absolute top-28 right-8 z-20 w-64 overflow-hidden rounded-[1.25rem] bg-black shadow-[0_18px_45px_rgba(0,0,0,0.28)] lg:right-10"
          type="button"
          onClick={() => setCameraEnabled((value) => !value)}
        >
          <div className="relative aspect-[1.34]">
            {cameraEnabled ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full scale-x-[-1] object-cover"
              />
            ) : (
              <div className="grid h-full place-items-center bg-black text-white/75">
                <p className="text-sm font-semibold">Camera is off</p>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/65 to-transparent px-5 py-4">
              <span className="text-base font-semibold">You</span>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/12 text-white backdrop-blur-md transition group-hover:bg-white/20">
                <VideoOff className="h-5 w-5" />
              </span>
            </div>
          </div>
        </button>

        <section className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-22 text-center">
          <div className="flex flex-col items-center">
            <AgentAudioVisualizerAura
              size="md"
              state="speaking"
              themeMode="dark"
              color="#72E58A"
              colorShift={0.24}
              className="h-32"
            />
            <h2 className="mt-5 text-xl font-bold tracking-[-0.02em]">Sara</h2>
            <p className="mt-1 text-sm font-medium text-white/42">Interview partner</p>
          </div>

          <p className="mt-14 max-w-130 text-center text-base leading-7 font-medium text-white/88">
            {MOCK_USER_ANSWER}
          </p>
        </section>

        <p className="absolute bottom-10 left-8 z-10 text-base font-bold tracking-[-0.01em] text-white/62">
          {formatDuration(elapsedSeconds)}
        </p>

        <div className="absolute inset-x-0 bottom-10 z-10 flex justify-center">
          <div className="flex min-w-48 items-center justify-center gap-5 rounded-full border border-white/8 bg-white/12 px-6 py-3 text-white/82 shadow-[0_14px_42px_rgba(0,0,0,0.24)] backdrop-blur-xl">
            <span className="text-sm font-bold">Sara Speaking</span>
            <AgentAudioVisualizerBar
              size="icon"
              state="thinking"
              barCount={5}
              color="#b9b0d6"
              className="h-5"
            />
          </div>
        </div>

        <div className="absolute right-8 bottom-10 z-10 hidden text-white/40 lg:block">
          <MicOff className="h-4 w-4" />
        </div>
      </div>
    </main>
  );
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
