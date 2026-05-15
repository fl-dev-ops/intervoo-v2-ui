"use client";

import { useLocalParticipant } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useEffect, useRef } from "react";

export function UserPipTile({
  isMuted,
  isCameraOff,
}: {
  isMuted: boolean;
  isCameraOff: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { localParticipant } = useLocalParticipant();

  const videoTrack = localParticipant.getTrackPublication(
    Track.Source.Camera,
  )?.track;

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoTrack) return;

    videoTrack.attach(el);
    return () => {
      videoTrack.detach(el);
    };
  }, [videoTrack]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-black/50 shadow-xl shadow-black/40 backdrop-blur-md">
      <div className="h-[140px] w-[180px] md:h-[160px] md:w-[200px]">
        {!isCameraOff && videoTrack ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-900/80">
            <div className="flex size-14 items-center justify-center rounded-full bg-white/10">
              <VideoOff className="size-7 text-white/50" />
            </div>
          </div>
        )}
      </div>

      {/* Status indicators */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
        {isMuted && (
          <div className="flex items-center gap-1 rounded-full bg-red-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
            <MicOff className="size-3" />
            Muted
          </div>
        )}
        {isCameraOff && (
          <div className="flex items-center gap-1 rounded-full bg-zinc-700/90 px-2 py-0.5 text-[10px] font-semibold text-white">
            <VideoOff className="size-3" />
            Camera off
          </div>
        )}
      </div>
    </div>
  );
}
