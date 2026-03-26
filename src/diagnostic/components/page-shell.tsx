import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

export function PreScreenPageShell({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5f7fb_0%,#edf2f7_100%)] px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:gap-5">
        <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-[0_28px_70px_rgba(15,23,42,0.08)] backdrop-blur md:flex-row md:items-end md:justify-between md:p-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
              Interview Practice
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 md:text-base">{description}</p>
          </div>

          <Link
            to="/"
            className="inline-flex w-fit items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Back home
          </Link>
        </div>

        {children}
      </div>
    </main>
  );
}
