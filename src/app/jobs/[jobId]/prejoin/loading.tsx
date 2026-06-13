export default function PrejoinLoading() {
  return (
    <main className="min-h-dvh bg-lavender font-sans text-black">
      <section className="mx-auto flex min-h-dvh w-full max-w-225 flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-[620px] rounded-[28px] border border-[#E6DFF0] bg-white p-5 shadow-[0_24px_70px_rgba(58,37,109,0.08)] md:p-7">
          <div className="mx-auto h-5 w-44 animate-pulse rounded-md bg-[#E4E0E7]" />

          <div className="mt-6 aspect-video w-full animate-pulse rounded-3xl bg-[#E4E0E7]" />

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="h-12 animate-pulse rounded-xl bg-[#F0ECF5]" />
            <div className="h-12 animate-pulse rounded-xl bg-[#F0ECF5]" />
          </div>

          <div className="mt-5 space-y-2">
            <div className="mx-auto h-4 w-72 max-w-full animate-pulse rounded-md bg-[#E4E0E7]" />
            <div className="mx-auto h-4 w-52 max-w-full animate-pulse rounded-md bg-[#E4E0E7]" />
          </div>

          <div className="mt-7 h-12 w-full animate-pulse rounded-full bg-[#6C47FF]/30" />
        </div>
      </section>
    </main>
  );
}
