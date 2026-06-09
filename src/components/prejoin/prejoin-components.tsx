"use client";

import {
  ArrowLeft,
  CheckIcon,
  ChevronDown,
  ChevronUp,
  Video,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getRoundConfig } from "@/lib/diagnostics/rounds-config";
import { cn } from "@/lib/utils";

type PermissionState = "checking" | "prompt" | "granted" | "denied";

export function Header({
  showBackButton = true,
}: {
  showBackButton?: boolean;
}) {
  const router = useRouter();
  return (
    <header className="w-full mx-auto mb-6">
      {showBackButton && (
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm font-medium text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
      )}
    </header>
  );
}

export function RoundInfoCard({ roundId }: { roundId: string }) {
  const [expanded, setExpanded] = useState(false);
  const config = getRoundConfig(roundId);
  if (!config) return null;

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <span className="text-sm font-semibold">
          {config.eyebrow} - {config.title}
        </span>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {config.duration}
          </span>
          {expanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
      )}
    </div>
  );
}

export function PreJoinChecklist() {
  return (
    <div className="rounded-2xl bg-[#F4F4F4] px-5 py-4 space-y-3">
      <p className="text-sm text-muted-foreground">Make sure you will have</p>
      <div className="space-y-3">
        {["Quiet space", "Good light", "Stable internet connectivity"].map(
          (item) => (
            <div key={item} className="flex items-center gap-2 text-sm">
              <CheckIcon className="size-5 bg-green-500 shrink-0 text-white rounded-full p-1" />
              {item}
            </div>
          ),
        )}
      </div>
    </div>
  );
}

export function PermissionStatusCard({
  permissionState,
}: {
  permissionState: PermissionState;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-white p-4">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-full",
            permissionState === "denied"
              ? "bg-red-100 text-red-700"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Video className="size-5" />
        </div>
        <div>
          <p className="text-sm font-medium">Microphone & Camera</p>
          <p className="text-xs text-muted-foreground">
            {permissionState === "denied" ? "Blocked" : "Permission needed"}
          </p>
        </div>
      </div>
      <PermissionBadge state={permissionState} />
    </div>
  );
}

export function PermissionBadge({ state }: { state: PermissionState }) {
  const config = {
    granted: { label: "Ready", className: "bg-green-100 text-green-700" },
    denied: { label: "Blocked", className: "bg-red-100 text-red-700" },
    prompt: { label: "Pending", className: "bg-muted text-muted-foreground" },
    checking: {
      label: "Checking",
      className: "bg-muted text-muted-foreground",
    },
  };

  const { label, className } = config[state];

  return (
    <span
      className={cn("rounded-full px-3 py-1 text-xs font-medium", className)}
    >
      {label}
    </span>
  );
}
