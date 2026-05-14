"use client";

import { useRemoteParticipants } from "@livekit/components-react";
import { ParticipantKind, Track, type RemoteParticipant } from "livekit-client";
import { useEffect, useRef, useState } from "react";

type AgentOrbState = "connecting" | "listening" | "thinking" | "speaking";

export function AgentOrbVisualizer({
  coachName = "Interviewer",
}: {
  coachName?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const remoteParticipants = useRemoteParticipants();
  const agentParticipant = remoteParticipants.find(
    (p) => p.kind === ParticipantKind.AGENT,
  );
  const [agentState, setAgentState] = useState<AgentOrbState>("connecting");
  const [audioLevel, setAudioLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const timeRef = useRef(0);

  // Set up audio analysis when agent connects
  useEffect(() => {
    if (!agentParticipant) {
      setAgentState("connecting");
      return;
    }

    const audioPub = agentParticipant.getTrackPublication(
      Track.Source.Microphone,
    );
    if (!audioPub || !audioPub.track) {
      setAgentState("connecting");
      return;
    }

    const mediaStreamTrack = audioPub.track.mediaStreamTrack;
    if (!mediaStreamTrack) {
      setAgentState("connecting");
      return;
    }

    const AudioContextConstructor =
      window.AudioContext ||
      (
        window as unknown as {
          webkitAudioContext: typeof AudioContext;
        }
      ).webkitAudioContext;
    const audioContext = new AudioContextConstructor();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.7;

    const stream = new MediaStream([mediaStreamTrack]);
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    sourceRef.current = source;
    setAgentState("listening");

    return () => {
      source.disconnect();
      analyser.disconnect();
      if (audioContext.state !== "closed") {
        void audioContext.close();
      }
    };
  }, [agentParticipant]);

  // Read audio levels
  useEffect(() => {
    if (!analyserRef.current) return;

    const readLevel = () => {
      const dataArray = new Uint8Array(analyserRef.current!.frequencyBinCount);
      analyserRef.current!.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length / 255;
      setAudioLevel(average);

      // Update state based on audio level
      if (average > 0.08) {
        setAgentState("speaking");
      } else if (agentState === "speaking" && average <= 0.05) {
        setAgentState("listening");
      }

      animationRef.current = requestAnimationFrame(readLevel);
    };

    animationRef.current = requestAnimationFrame(readLevel);
    return () => cancelAnimationFrame(animationRef.current);
  }, [analyserRef.current, agentState]);

  // Initialize particles
  useEffect(() => {
    const particles: Particle[] = [];
    for (let i = 0; i < 80; i++) {
      particles.push(createParticle());
    }
    particlesRef.current = particles;
  }, []);

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId: number;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const baseRadius = Math.min(rect.width, rect.height) * 0.22;

      ctx.clearRect(0, 0, rect.width, rect.height);
      timeRef.current += 0.016;

      const isSpeaking = agentState === "speaking";
      const pulseIntensity = isSpeaking ? 0.6 + audioLevel * 0.8 : 0.15;
      const pulseRadius = baseRadius * (1 + pulseIntensity * 0.3);

      // Background radial gradient (aurora)
      const bgGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        rect.width * 0.6,
      );
      bgGradient.addColorStop(
        0,
        `rgba(106, 77, 245, ${0.12 + pulseIntensity * 0.15})`,
      );
      bgGradient.addColorStop(
        0.3,
        `rgba(79, 51, 163, ${0.08 + pulseIntensity * 0.1})`,
      );
      bgGradient.addColorStop(
        0.6,
        `rgba(49, 46, 129, ${0.04 + pulseIntensity * 0.05})`,
      );
      bgGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Core orb glow
      const coreGlow = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        pulseRadius * 1.5,
      );
      coreGlow.addColorStop(
        0,
        `rgba(139, 92, 246, ${0.4 + pulseIntensity * 0.3})`,
      );
      coreGlow.addColorStop(0.4, `rgba(106, 77, 245, ${0.2 + pulseIntensity * 0.2})`);
      coreGlow.addColorStop(0.7, `rgba(79, 51, 163, ${0.08 + pulseIntensity * 0.1})`);
      coreGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseRadius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Inner orb
      const innerGradient = ctx.createRadialGradient(
        centerX - pulseRadius * 0.15,
        centerY - pulseRadius * 0.15,
        0,
        centerX,
        centerY,
        pulseRadius,
      );
      innerGradient.addColorStop(0, "rgba(167, 139, 250, 0.9)");
      innerGradient.addColorStop(0.5, "rgba(139, 92, 246, 0.7)");
      innerGradient.addColorStop(0.8, "rgba(106, 77, 245, 0.4)");
      innerGradient.addColorStop(1, "rgba(79, 51, 163, 0.1)");

      ctx.fillStyle = innerGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
      ctx.fill();

      // Orb ring
      ctx.strokeStyle = `rgba(167, 139, 250, ${0.3 + pulseIntensity * 0.4})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseRadius * 0.95, 0, Math.PI * 2);
      ctx.stroke();

      // Particles
      particlesRef.current.forEach((p) => {
        updateParticle(p, timeRef.current, isSpeaking, audioLevel);
        const px = centerX + Math.cos(p.angle) * p.distance;
        const py = centerY + Math.sin(p.angle) * p.distance;

        ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, [agentState, audioLevel]);

  const displayName = agentParticipant?.name || coachName;
  const statusText =
    agentState === "connecting"
      ? "Connecting..."
      : agentState === "speaking"
        ? "Speaking"
        : agentState === "thinking"
          ? "Thinking..."
          : "Listening";

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ filter: "blur(0.5px)" }}
      />
      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white">{displayName}</h2>
          <p className="mt-1 text-sm font-medium text-violet-200/80">
            {statusText}
          </p>
        </div>
      </div>
    </div>
  );
}

type Particle = {
  angle: number;
  distance: number;
  baseDistance: number;
  size: number;
  alpha: number;
  speed: number;
  color: { r: number; g: number; b: number };
  phase: number;
};

function createParticle(): Particle {
  const colors = [
    { r: 167, g: 139, b: 250 }, // violet-400
    { r: 139, g: 92, b: 246 }, // violet-500
    { r: 124, g: 58, b: 237 }, // violet-600
    { r: 109, g: 40, b: 217 }, // violet-700
    { r: 196, g: 181, b: 253 }, // violet-300
  ];
  return {
    angle: Math.random() * Math.PI * 2,
    distance: 0,
    baseDistance: 80 + Math.random() * 120,
    size: 1 + Math.random() * 3,
    alpha: 0.2 + Math.random() * 0.5,
    speed: 0.2 + Math.random() * 0.8,
    color: colors[Math.floor(Math.random() * colors.length)],
    phase: Math.random() * Math.PI * 2,
  };
}

function updateParticle(
  p: Particle,
  time: number,
  isSpeaking: boolean,
  audioLevel: number,
) {
  p.angle += p.speed * 0.003;

  const pulse = isSpeaking
    ? Math.sin(time * 3 + p.phase) * audioLevel * 60
    : Math.sin(time * 0.5 + p.phase) * 8;

  p.distance = p.baseDistance + pulse;
  p.alpha = isSpeaking
    ? 0.3 + audioLevel * 0.5 + Math.sin(time * 2 + p.phase) * 0.2
    : 0.15 + Math.sin(time * 0.3 + p.phase) * 0.1;
}
