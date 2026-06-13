import { AppHeader } from "@/components/app-header";

export default function ReportLoading() {
  return (
    <main className="min-h-dvh bg-[#F6F3F8] font-sans text-black">
      <AppHeader />
      <section className="mx-auto w-full max-w-225 px-4 pb-14 pt-6">
        <div className="grid gap-4 md:grid-cols-[1fr_330px]">
          <div className="rounded-2xl bg-white px-5 py-5 shadow-sm">
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

          <div className="h-48 animate-pulse rounded-2xl bg-white shadow-sm" />
        </div>

        <div className="mt-4 rounded-2xl bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="size-14 animate-pulse rounded-full bg-[#E4E0E7]" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-5 w-44 animate-pulse rounded-md bg-[#E4E0E7]" />
              <div className="h-4 w-64 max-w-full animate-pulse rounded-md bg-[#E4E0E7]" />
            </div>
            <div className="hidden h-5 w-20 animate-pulse rounded-md bg-[#E4E0E7] md:block" />
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="p-4">
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  className="h-12 min-w-[180px] animate-pulse rounded-xl bg-[#E4E0E7]"
                  key={index}
                />
              ))}
            </div>
          </div>

          <div className="px-4 pb-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="h-5 w-32 animate-pulse rounded-md bg-[#E4E0E7]" />
              <div className="h-4 w-40 animate-pulse rounded-md bg-[#E4E0E7]" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="h-32 animate-pulse rounded-xl bg-emerald-100/80" />
              <div className="h-32 animate-pulse rounded-xl bg-orange-100/80" />
            </div>
          </div>

          <div className="border-t border-[#EFEAF5] px-4 py-5">
            <div className="h-5 w-52 animate-pulse rounded-md bg-[#E4E0E7]" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  className="h-24 animate-pulse rounded-xl bg-[#F1EEF5]"
                  key={index}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
