import { useEffect, useMemo, useState } from "react";
import { cn } from "#/lib/utils";

type LiveWaveformProps = {
  active?: boolean;
  processing?: boolean;
  bars?: number;
  className?: string;
};

export function LiveWaveform({
  active = false,
  processing = false,
  bars = 32,
  className,
}: LiveWaveformProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active && !processing) {
      return;
    }

    const interval = window.setInterval(() => {
      setTick((current) => current + 1);
    }, 70);

    return () => {
      window.clearInterval(interval);
    };
  }, [active, processing]);

  const heights = useMemo(() => {
    return Array.from({ length: bars }, (_, index) => {
      const distanceFromCenter = Math.abs(index - (bars - 1) / 2);
      const falloff = 1 - distanceFromCenter / ((bars - 1) / 2);
      const wave = (Math.sin(index * 0.65 + tick * 0.55) + 1) / 2;
      const pulse = (Math.sin(index * 0.35 + tick * 0.22) + 1) / 2;
      const energy = active ? 0.35 + wave * 0.65 : processing ? 0.22 + pulse * 0.4 : 0.12;

      return Math.max(10, Math.round((10 + 26 * falloff) * energy + 6));
    });
  }, [active, bars, processing, tick]);

  return (
    <div
      aria-hidden="true"
      className={cn("flex h-9 items-center justify-center gap-1 overflow-hidden", className)}
    >
      {heights.map((height, index) => (
        <span
          key={`wave-bar-${index}`}
          className={cn(
            "w-1.5 rounded-full bg-[#6A4DF5] transition-[height,opacity] duration-150",
            active || processing ? "opacity-100" : "opacity-45",
          )}
          style={{ height }}
        />
      ))}
    </div>
  );
}
