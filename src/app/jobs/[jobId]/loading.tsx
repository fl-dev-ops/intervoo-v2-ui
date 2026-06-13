import { AppHeader } from "@/components/app-header";

export default function JobDetailLoading() {
  return (
    <main className="min-h-dvh bg-[#F6F3F8] font-sans text-black">
      <AppHeader />
      <section className="mx-auto w-full max-w-225 px-4 pb-14 pt-6">
        {/* Back button skeleton */}
        <div className="h-6 w-16 animate-pulse rounded-md bg-[#E4E0E7]" />

        {/* Two-column grid: job summary + readiness */}
        <div className="mt-8 grid w-full gap-4 md:grid-cols-[1fr_330px]">
          {/* Job summary card skeleton */}
          <div className="rounded-2xl bg-white px-5 py-5">
            <div className="flex items-start gap-4">
              <div className="size-[72px] shrink-0 animate-pulse rounded-xl bg-[#E4E0E7]" />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="h-4 w-28 animate-pulse rounded-md bg-[#E4E0E7]" />
                <div className="h-6 w-3/4 animate-pulse rounded-md bg-[#E4E0E7]" />
                <div className="flex gap-2">
                  <div className="h-6 w-24 animate-pulse rounded-full bg-[#E4E0E7]" />
                  <div className="h-6 w-20 animate-pulse rounded-full bg-[#E4E0E7]" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full animate-pulse rounded-md bg-[#E4E0E7]" />
                  <div className="h-4 w-2/3 animate-pulse rounded-md bg-[#E4E0E7]" />
                </div>
              </div>
            </div>
          </div>

          {/* Interview readiness skeleton */}
          <div className="h-48 animate-pulse rounded-2xl bg-white" />
        </div>

        {/* Rounds section skeleton */}
        <div className="mt-7 w-full rounded-[28px] bg-[linear-gradient(180deg,#0B061E_0%,#3C2390_100%)] px-5 py-9 md:px-8 md:py-10">
          <div className="space-y-7">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="md:grid md:grid-cols-[44px_1fr] md:gap-x-4"
              >
                <div className="relative hidden justify-center md:flex">
                  {i < 3 && (
                    <div className="absolute top-10 bottom-[-28px] w-px bg-[#6C47FF]/70" />
                  )}
                  <div className="relative z-10 mt-3 flex size-8 items-center justify-center rounded-full border border-[#7A5CD7]/70 bg-[#2B176B]">
                    <div className="size-4 animate-pulse rounded bg-[#7A5CD7]/30" />
                  </div>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/10 px-5 py-5 md:px-7">
                  <div className="flex items-start justify-between gap-4">
                    <div className="h-4 w-20 animate-pulse rounded bg-white/20" />
                    <div className="h-6 w-16 animate-pulse rounded-full bg-white/15" />
                  </div>
                  <div className="mt-3 h-6 w-2/3 animate-pulse rounded bg-white/20" />
                  <div className="mt-2 h-4 w-full animate-pulse rounded bg-white/10" />
                  <div className="mt-4 flex gap-2">
                    <div className="h-6 w-24 animate-pulse rounded-xl bg-white/10" />
                    <div className="h-6 w-28 animate-pulse rounded-xl bg-white/10" />
                    <div className="h-6 w-20 animate-pulse rounded-xl bg-white/10" />
                  </div>
                  <div className="mt-4 h-10 w-40 animate-pulse rounded-full bg-white/15" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
