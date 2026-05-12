"use client";

import { cn } from "@/lib/utils";

export type InterviewReadinessScoreProps = {
  score?: number | null;
  maxScore?: number;
  className?: string;
};

export function InterviewReadinessScore({
  score,
  maxScore = 100,
  className,
}: InterviewReadinessScoreProps) {
  const hasScore = typeof score === "number";
  const percentage = hasScore ? Math.min(Math.max(score, 0), maxScore) : 0;
  const normalized = percentage / maxScore;

  // Semi-circle gauge: arc from 180deg to 0deg (left to right)
  // SVG path for the background arc
  const radius = 80;
  const strokeWidth = 12;
  const centerX = 100;
  const centerY = 100;
  const startAngle = 180;
  const endAngle = 0;

  // Calculate arc path
  const polarToCartesian = (
    cx: number,
    cy: number,
    r: number,
    angleDeg: number,
  ) => {
    const angleRad = ((angleDeg - 180) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(angleRad),
      y: cy + r * Math.sin(angleRad),
    };
  };

  const describeArc = (
    cx: number,
    cy: number,
    r: number,
    startAngleDeg: number,
    endAngleDeg: number,
  ) => {
    const start = polarToCartesian(cx, cy, r, endAngleDeg);
    const end = polarToCartesian(cx, cy, r, startAngleDeg);
    const largeArcFlag = endAngleDeg - startAngleDeg <= 180 ? "0" : "1";
    return [
      "M",
      start.x,
      start.y,
      "A",
      r,
      r,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y,
    ].join(" ");
  };

  const bgArcPath = describeArc(centerX, centerY, radius, startAngle, endAngle);

  // Foreground arc (score)
  const scoreEndAngle = hasScore
    ? startAngle - (startAngle - endAngle) * normalized
    : startAngle;
  const scoreArcPath = hasScore
    ? describeArc(centerX, centerY, radius, startAngle, scoreEndAngle)
    : "";

  // Color based on score
  const getScoreColor = (s: number) => {
    if (s >= 91) return "#22c55e"; // green-500
    if (s >= 71) return "#3b82f6"; // blue-500
    if (s >= 51) return "#f59e0b"; // amber-500
    return "#ef4444"; // red-500
  };

  const scoreColor = hasScore ? getScoreColor(percentage) : "#e5e7eb";

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <p className="text-sm font-semibold text-foreground">
        Interview Readiness Score
      </p>

      <div className="relative mt-2">
        <svg
          height="120"
          viewBox="0 0 200 120"
          width="200"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background arc */}
          <path
            d={bgArcPath}
            fill="none"
            stroke="#e5e7eb"
            strokeLinecap="round"
            strokeWidth={strokeWidth}
          />

          {/* Score arc */}
          {hasScore && (
            <path
              d={scoreArcPath}
              fill="none"
              stroke={scoreColor}
              strokeLinecap="round"
              strokeWidth={strokeWidth}
            />
          )}
        </svg>

        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <span className="text-3xl font-bold text-foreground">
            {hasScore ? percentage : "--"}
            <span className="text-lg font-semibold text-muted-foreground">
              /{maxScore}
            </span>
          </span>
        </div>
      </div>

      {/* Labels */}
      <div className="mt-1 flex w-full justify-between px-4 text-[10px] text-muted-foreground">
        <div className="flex flex-col items-center">
          <span>No Hire</span>
          <span>0-50</span>
        </div>
        <div className="flex flex-col items-center">
          <span>Hold</span>
          <span>51-70</span>
        </div>
        <div className="flex flex-col items-center">
          <span>Hire</span>
          <span>71-90</span>
        </div>
        <div className="flex flex-col items-center">
          <span>Strong Hire</span>
          <span>91-100</span>
        </div>
      </div>

      {!hasScore && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <svg
            className="h-4 w-4 shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              clipRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
              fillRule="evenodd"
            />
          </svg>
          Complete 4 rounds to generate score
        </div>
      )}
    </div>
  );
}
