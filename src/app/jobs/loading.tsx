import { AppHeader } from "@/components/app-header";

export default function JobsLoading() {
  return (
    <main className="min-h-screen bg-[#F5F3F7] font-sans text-black">
      <AppHeader />
      <section className="mx-auto w-full max-w-225 px-4 pb-12 pt-6">
        {/* Title skeleton */}
        <div className="h-7 w-64 animate-pulse rounded-lg bg-[#E4E0E7]" />

        {/* Job card skeletons */}
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-[#E4E0E7] bg-white px-5 py-5 shadow-sm"
            >
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
          ))}
        </div>
      </section>
    </main>
  );
}
