import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { Link } from "@tanstack/react-router";
import { LayoutGrid, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { Button } from "#/components/ui/button";
import { LiveWaveform } from "#/components/ui/live-waveform";
import { Track, usePreviewTracks, useTrackToggle } from "#/shared/livekit";
import {
  getDiagnosticJobOption,
  type DiagnosticBand,
  type DiagnosticJobOption,
} from "#/lib/diagnostics/job-options";

type DiagnosticsSessionPageProps = {
  band: DiagnosticBand;
  options: DiagnosticJobOption[];
};

const MOCK_TRANSCRIPT = [
  {
    id: "agent-1",
    role: "agent",
    text: "Tell me about a product problem you solved and how you approached it.",
  },
  {
    id: "user-1",
    role: "user",
    text: "I started by understanding the user issue, then broke it into smaller parts before proposing a solution.",
  },
  {
    id: "agent-2",
    role: "agent",
    text: "Good. What tradeoff did you consider while choosing that solution?",
  },
  {
    id: "user-2",
    role: "user",
    text: "The main tradeoff was speed versus reliability. I chose reliability because the feature affected repeat users.",
  },
  {
    id: "agent-3",
    role: "agent",
    text: "Now explain how you would measure whether the solution worked.",
  },
  {
    id: "user-3",
    role: "user",
    text: "I would track completion rate, drop-off points, and feedback from users after the change.",
  },
] as const;

export function DiagnosticsSessionPage(props: DiagnosticsSessionPageProps) {
  const selectedOption = getDiagnosticJobOption(props.options, props.band);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const microphoneToggle = useTrackToggle({
    source: Track.Source.Microphone,
    initialState: true,
  });
  const cameraToggle = useTrackToggle({
    source: Track.Source.Camera,
    initialState: true,
  });
  const micEnabled = microphoneToggle.enabled;
  const cameraEnabled = cameraToggle.enabled;
  const previewTracks = usePreviewTracks({
    audio: micEnabled,
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
    <main className="h-screen max-h-screen overflow-hidden bg-[#111111] text-white">
      <div className="flex h-full max-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs text-white/55">Diagnostic interview</p>
            <h1 className="line-clamp-1 text-base font-semibold sm:text-lg">
              {selectedOption?.title ?? "Selected job"}
            </h1>
          </div>
          <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium">
            {formatDuration(elapsedSeconds)}
          </div>
        </header>

        <section
          className={`grid min-h-0 flex-1 gap-4 p-4 transition-[grid-template-columns] lg:p-6 ${
            sidePanelOpen ? "lg:grid-cols-[1fr_22rem]" : "lg:grid-cols-1"
          }`}
        >
          <div className="relative min-h-0">
            <MeetingTile label="You" muted={!micEnabled} className="h-full min-h-0">
              {cameraEnabled ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full scale-x-[-1] object-cover"
                />
              ) : (
                <div className="grid h-full min-h-full w-full place-items-center bg-[#17131f]">
                  <div className="flex flex-col items-center gap-3 text-white/70">
                    <VideoOff className="h-10 w-10" />
                    <span>Camera is off</span>
                  </div>
                </div>
              )}
            </MeetingTile>

            <div className="absolute right-4 bottom-4 z-10 w-38 origin-bottom-right scale-[0.85] overflow-hidden rounded-2xl border border-white/15 bg-[radial-gradient(circle_at_top,#352076,#0d0a16_58%)] shadow-[0_20px_45px_rgba(0,0,0,0.35)] sm:w-52">
              <div className="aspect-video grid place-items-center px-3 py-4">
                <img
                  alt="AI interviewer"
                  className="h-14 w-14 rounded-full object-cover ring-2 ring-white/15 sm:h-18 sm:w-18"
                  src="/sara.png"
                />
              </div>
            </div>
          </div>

          {sidePanelOpen ? (
            <aside className="relative min-h-0 rounded-[1.5rem] border border-white/10 bg-white/8">
              <div className="flex h-full min-h-0 flex-col p-5 pr-4">
                <p className="text-sm font-semibold text-white/70">Current band</p>
                <h2 className="mt-2 text-xl font-bold">{selectedOption?.label ?? "Diagnostic"}</h2>
                <p className="mt-2 text-sm leading-6 text-white/62">
                  {selectedOption?.description}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {selectedOption?.companies.slice(0, 5).map((company) => (
                    <span key={company} className="rounded-full bg-white/10 px-3 py-1 text-xs">
                      {company}
                    </span>
                  ))}
                </div>

                <div className="mt-6 border-t border-white/10 pt-5">
                  <p className="text-sm font-semibold text-white/70">Transcript</p>
                </div>
                <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin]">
                  {MOCK_TRANSCRIPT.map((message) => (
                    <TranscriptBubble key={message.id} {...message} />
                  ))}
                </div>
              </div>
            </aside>
          ) : null}
        </section>

        <footer className="grid grid-cols-[1fr_auto_1fr] items-center border-t border-white/10 px-4 py-4">
          <div />
          <div className="flex items-center justify-center gap-3">
            <ControlButton
              active={micEnabled}
              activeIcon={
                <LiveWaveform
                  active
                  mode="static"
                  barWidth={5}
                  barGap={4}
                  barRadius={5}
                  barColor="#8d76cf"
                  fadeEdges={false}
                  height={28}
                  historySize={3}
                  fftSize={64}
                  updateRate={24}
                  className="w-[29px]"
                />
              }
              inactiveIcon={<MicOff className="h-5 w-5" />}
              label={micEnabled ? "Mute" : "Unmute"}
              buttonProps={microphoneToggle.buttonProps}
            />
            <ControlButton
              active={cameraEnabled}
              activeIcon={<Video className="h-5 w-5" />}
              inactiveIcon={<VideoOff className="h-5 w-5" />}
              label={cameraEnabled ? "Stop video" : "Start video"}
              buttonProps={cameraToggle.buttonProps}
            />
            <Button
              asChild
              variant="destructive"
              size="icon-lg"
              className="h-14 w-14 bg-[#e5484d] text-white shadow-none hover:bg-[#d93d42]"
            >
              <Link to="/diagnostics/report" search={{ band: selectedOption?.band ?? props.band }}>
                <PhoneOff className="h-6 w-6" />
              </Link>
            </Button>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="icon-lg"
            className="ml-auto h-14 w-14 bg-white/10 text-white shadow-none hover:bg-white/15"
            title={sidePanelOpen ? "Collapse panel" : "Expand panel"}
            onClick={() => setSidePanelOpen((value) => !value)}
          >
            <LayoutGrid className="h-5 w-5" />
          </Button>
        </footer>
      </div>
    </main>
  );
}

function MeetingTile(props: {
  children: ReactNode;
  label: string;
  active?: boolean;
  muted?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative min-h-64 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#17131f] ${props.className ?? ""}`}
    >
      <div className="h-full min-h-64 w-full">{props.children}</div>
      <div className="absolute right-4 bottom-4 left-4 flex items-center justify-between">
        <span className="rounded-full bg-black/45 px-3 py-1.5 text-sm backdrop-blur">
          {props.label}
        </span>
        {props.muted ? (
          <span className="rounded-full bg-black/45 p-2 backdrop-blur">
            <MicOff className="h-4 w-4" />
          </span>
        ) : null}
        {props.active ? (
          <span className="rounded-full border border-[#5dcc83]/40 bg-[#5dcc83]/20 px-3 py-1.5 text-xs text-[#8df0a8]">
            Speaking
          </span>
        ) : null}
      </div>
    </div>
  );
}

function TranscriptBubble(props: { role: "agent" | "user"; text: string }) {
  const isUser = props.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-5 ${
          isUser ? "bg-[#6A4DF5] text-white" : "bg-white/10 text-white/82"
        }`}
      >
        <div className="mb-1 text-[11px] font-semibold text-white/55">
          {isUser ? "You" : "Sana"}
        </div>
        {props.text}
      </div>
    </div>
  );
}

function ControlButton(props: {
  active: boolean;
  activeIcon: ReactNode;
  inactiveIcon: ReactNode;
  label: string;
  buttonProps: ButtonHTMLAttributes<HTMLButtonElement>;
}) {
  return (
    <Button
      {...props.buttonProps}
      type="button"
      size="icon-lg"
      variant={props.active ? "secondary" : "destructive"}
      className={
        props.active
          ? "h-14 w-14 bg-white text-[#2b2233] shadow-none hover:bg-white/90"
          : "h-14 w-14 bg-[#e5484d] text-white shadow-none hover:bg-[#d93d42]"
      }
      title={props.label}
    >
      {props.active ? props.activeIcon : props.inactiveIcon}
    </Button>
  );
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
