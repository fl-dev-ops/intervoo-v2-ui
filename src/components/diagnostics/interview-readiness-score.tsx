"use client";

import dynamic from "next/dynamic";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

const GaugeComponent = dynamic(() => import("react-gauge-component"), {
  ssr: false,
});

export type InterviewReadinessScoreProps = ComponentPropsWithoutRef<"div"> & {
  score?: number | null;
  maxScore?: number;
};

type Segment = {
  key: "noHire" | "hold" | "hire" | "strongHire";
  label: string;
  range: string;
  // Normalized gauge limits keep the four visual bands equal-sized.
  gaugeLimit: number;
  min: number;
  max: number;
  color: string;
  emoji: string;
};

const EMPTY_COLOR = "#d1d5db";
// Gauge operates on 0-100 with four equal visual segments of 25 each.
const GAUGE_MAX = 100;
const SEGMENT_SIZE = 25;
const SEGMENT_INSET = 2;

const SEGMENTS: Segment[] = [
  {
    key: "noHire",
    label: "No Hire",
    range: "0-50",
    gaugeLimit: 25,
    min: 0,
    max: 50,
    color: "#ef4444",
    emoji: "😟",
  },
  {
    key: "hold",
    label: "Waitlist",
    range: "51-70",
    gaugeLimit: 50,
    min: 51,
    max: 70,
    color: "#f59e0b",
    emoji: "🤔",
  },
  {
    key: "hire",
    label: "Hire",
    range: "71-90",
    gaugeLimit: 75,
    min: 71,
    max: 90,
    color: "#84cc16",
    emoji: "🙂",
  },
  {
    key: "strongHire",
    label: "Strong Hire",
    range: "91-100",
    gaugeLimit: 100,
    min: 91,
    max: 100,
    color: "#22c55e",
    emoji: "🎉",
  },
];

function getSegment(score: number): Segment {
  for (const seg of SEGMENTS) {
    if (score >= seg.min && score <= seg.max) return seg;
  }
  return SEGMENTS[SEGMENTS.length - 1];
}

// Map a ratio (0-1) within a visual segment, accounting for padding gaps.
function mapWithinVisualSegment(ratio: number, segmentIndex: number): number {
  const start = segmentIndex * SEGMENT_SIZE + SEGMENT_INSET;
  const end = (segmentIndex + 1) * SEGMENT_SIZE - SEGMENT_INSET;
  return start + ratio * (end - start);
}

// Map real score thresholds into equal visual gauge segments, adjusted for arc padding.
function toGaugeValue(score: number): number {
  if (score <= 0) return 0;
  if (score >= 100) return 100;
  if (score <= 50) return mapWithinVisualSegment(score / 50, 0);
  if (score <= 70) return mapWithinVisualSegment((score - 50) / 20, 1);
  if (score <= 90) return mapWithinVisualSegment((score - 70) / 20, 2);
  return mapWithinVisualSegment((score - 90) / 10, 3);
}

export function InterviewReadinessScore({
  score,
  maxScore = 100,
  className,
  style,
  ...props
}: InterviewReadinessScoreProps) {
  const hasScore = typeof score === "number";
  const clampedScore = hasScore ? Math.min(Math.max(score, 0), maxScore) : 0;
  const segment = hasScore ? getSegment(clampedScore) : null;
  const gaugeValue = hasScore ? toGaugeValue(clampedScore) : 0;

  const subArcs = SEGMENTS.map((seg) => ({
    limit: seg.gaugeLimit,
    color: hasScore ? seg.color : EMPTY_COLOR,
    showTick: false,
    tooltip: { text: `${seg.label} (${seg.range})` },
  }));

  return (
    <div
      className={cn(
        "flex max-w-full flex-col items-center",
        "border p-4 rounded-xl bg-white md:bg-[#f5f3f7]",
        className,
      )}
      style={style}
      {...props}
    >
      <p className="text-base font-bold text-foreground mb-8">
        Interview Readiness Score
      </p>

      <div className="relative mt-3 w-[65%] mx-auto">
        <GaugeComponent
          type="semicircle"
          minValue={0}
          maxValue={GAUGE_MAX}
          value={gaugeValue}
          arc={{
            width: 0.1,
            padding: 0.04,
            cornerRadius: 10,
            subArcs,
          }}
          pointer={{
            type: "needle",
            color: "#412790",
            length: 0.7,
            width: 8,
            maxFps: 30,
            elastic: false,
            hide: !hasScore,
            baseColor: "#412790",
          }}
          labels={{
            valueLabel: {
              formatTextValue: () =>
                hasScore ? `${clampedScore}/${maxScore}` : `--/${maxScore}`,
              style: {
                fontSize: "40px",
                fill: "#111",
                fontWeight: "800",
                textShadow: "none",
              },
            },
            tickLabels: {
              hideMinMax: true,
              defaultTickValueConfig: {
                style: { fontSize: "0px", fill: "transparent" },
              },
              defaultTickLineConfig: {
                color: "transparent",
                length: 0,
                width: 0,
              },
            },
          }}
        />

        {SEGMENTS.map((seg, i) => {
          const positions = [
            { left: "-8%", top: "72%" },
            { left: "24%", top: "-6%" },
            { left: "78%", top: "-6%" },
            { left: "112%", top: "72%" },
          ];
          const pos = positions[i];
          return (
            <div
              key={seg.key}
              className="pointer-events-none absolute text-center text-xs leading-tight whitespace-nowrap"
              style={{
                left: pos.left,
                top: pos.top,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="text-muted-foreground">{seg.label}</div>
              <div className="font-bold text-foreground">{seg.range}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex w-full justify-center">
        {hasScore && segment ? (
          <div
            className="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold text-white"
            style={{ backgroundColor: segment.color }}
          >
            <span aria-hidden>{segment.emoji}</span>
            <span>{segment.label}</span>
          </div>
        ) : (
          <div className="text-[14px] flex w-full items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-900">
            <span
              aria-hidden
              className="flex size-4 shrink-0 items-center justify-center rounded-sm bg-amber-500 font-bold text-white"
            >
              !
            </span>
            <span>Complete 4 rounds to generate score</span>
          </div>
        )}
      </div>
    </div>
  );
}
