import type { ReactNode } from "react";

export function PreScreenStatusBanner({
  tone,
  children,
}: {
  tone: "error" | "success" | "info";
  children: ReactNode;
}) {
  const toneClassName =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-sky-200 bg-sky-50 text-sky-700";

  return <div className={`rounded-2xl border px-4 py-3 text-sm ${toneClassName}`}>{children}</div>;
}
