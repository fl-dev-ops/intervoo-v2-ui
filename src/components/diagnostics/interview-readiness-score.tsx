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

const EMPTY_COLOR = "#E4E4E4";
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
        "rounded-xl border bg-white p-3 md:p-4",
        className,
      )}
      style={style}
      {...props}
    >
      <p className="mb-4 text-center text-base font-bold text-foreground">
        Interview Readiness Score
      </p>

      <div className="relative mx-auto mt-2 w-[72%]">
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
                fontSize: "24px",
                fill: "#111",
                fontWeight: "500",
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

      <div className="mt-5 flex w-full justify-center">
        {hasScore && segment ? (
          <div
            className="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold text-white"
            style={{ backgroundColor: segment.color }}
          >
            <span aria-hidden>{segment.emoji}</span>
            <span>{segment.label}</span>
          </div>
        ) : (
          <div className="flex w-full items-center gap-3 rounded-xl border border-[#E8D995] bg-[#FFFDF0] px-3 py-2.5 text-sm text-[#55505B]">
            <span
              aria-hidden
              className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#C7AE3F] font-bold text-white"
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
