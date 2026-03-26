interface WaveformBarsProps {
  isSpeaking: boolean;
}

export function WaveformBars({ isSpeaking }: WaveformBarsProps) {
  const bars = isSpeaking ? ["h-4", "h-6", "h-5"] : ["h-1.5", "h-1.5", "h-1.5"];

  return (
    <div className="flex items-end gap-1">
      {bars.map((height, index) => (
        <span
          key={`${height}-${index}`}
          className={`w-1 rounded-full bg-emerald-500 transition-all duration-150 ${
            isSpeaking ? "animate-pulse opacity-100" : "opacity-50"
          } ${height}`}
        />
      ))}
    </div>
  );
}
