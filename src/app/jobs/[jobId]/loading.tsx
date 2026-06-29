import { AppHeader } from "@/components/app-header";

export default function JobDetailLoading() {
  return (
    <main className="min-h-dvh bg-[#F6F3F8] font-sans text-black">
      <AppHeader />
      <section className="mx-auto w-full max-w-225 px-4 pb-14 pt-6">
        {/* Back button skeleton */}
        <div className="h-6 w-16 animate-pulse rounded-md bg-[#E4E0E7]" />

        {/* Match details skeleton */}
        <div className="mt-8 space-y-5">
          <div className="rounded-2xl bg-white px-5 py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="h-4 w-28 animate-pulse rounded-md bg-[#E4E0E7]" />
                <div className="h-7 w-3/5 animate-pulse rounded-md bg-[#E4E0E7]" />
                <div className="h-3 w-48 animate-pulse rounded-md bg-[#E4E0E7]" />
              </div>
              <div className="flex shrink-0 items-center gap-5">
                <div className="size-16 animate-pulse rounded-full bg-[#E4E0E7]" />
                <div className="h-14 w-36 animate-pulse rounded-full bg-[#E4E0E7]" />
              </div>
            </div>
            <div className="mt-5 h-8 w-28 animate-pulse rounded-lg bg-[#E4E0E7]" />
            <div className="mt-5 space-y-2">
              <div className="h-3 w-full animate-pulse rounded-md bg-[#E4E0E7]" />
              <div className="h-3 w-4/5 animate-pulse rounded-md bg-[#E4E0E7]" />
            </div>
            <div className="mt-5 flex gap-3">
              <div className="h-9 w-36 animate-pulse rounded-lg bg-[#E4E0E7]" />
              <div className="h-9 w-24 animate-pulse rounded-lg bg-[#E4E0E7]" />
              <div className="h-9 w-28 animate-pulse rounded-lg bg-[#E4E0E7]" />
            </div>
          </div>

          <div className="rounded-2xl bg-white px-5 py-6">
            <div className="h-4 w-20 animate-pulse rounded-md bg-[#E4E0E7]" />
            <div className="mt-5 flex gap-2">
              <div className="h-9 w-28 animate-pulse rounded-lg bg-[#E4E0E7]" />
              <div className="h-9 w-24 animate-pulse rounded-lg bg-[#E4E0E7]" />
              <div className="h-9 w-32 animate-pulse rounded-lg bg-[#E4E0E7]" />
            </div>
          </div>

          {["Responsibilities", "Requirements", "Nice to have"].map(
            (section) => (
              <div key={section} className="rounded-2xl bg-white px-5 py-6">
                <div className="h-4 w-36 animate-pulse rounded-md bg-[#E4E0E7]" />
                <div className="mt-5 space-y-3">
                  <div className="h-4 w-full animate-pulse rounded-md bg-[#E4E0E7]" />
                  <div className="h-4 w-4/5 animate-pulse rounded-md bg-[#E4E0E7]" />
                  <div className="h-4 w-11/12 animate-pulse rounded-md bg-[#E4E0E7]" />
                </div>
              </div>
            ),
          )}
        </div>
      </section>
    </main>
  );
}
