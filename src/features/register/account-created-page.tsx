import { useEffect } from "react";
import { IconCheck } from "@tabler/icons-react";
import { triggerCelebrationConfetti } from "#/lib/confetti";

export function AccountCreatedPage() {
  useEffect(() => {
    void triggerCelebrationConfetti();
  }, []);

  return (
    <section className="relative min-h-screen">
      {/* Desktop: centered card */}
      <div className="hidden min-h-screen md:flex md:items-center md:justify-center md:px-6">
        <div className="flex w-full max-w-105 flex-col items-center rounded-4xl bg-white px-8 py-16 shadow-xl text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#efeaf5]">
            <IconCheck className="h-12 w-12" />
          </div>
          <h2 className="mt-7 text-3xl font-semibold">Congratulations!</h2>
          <p className="mt-2 text-sm font-normal text-gray-500">Your Intervoo account is ready.</p>
        </div>
      </div>

      {/* Mobile: full-screen white */}
      <div className="flex h-screen flex-col items-center justify-between bg-white md:hidden">
        <div className="flex flex-col items-center mt-30">
          <div className="mt-4 flex h-24 w-24 items-center justify-center rounded-full bg-[#efeaf5]">
            <IconCheck className="h-12 w-12" />
          </div>
          <h2 className="mt-7 text-3xl font-semibold">Congratulations!</h2>
          <p className="mt-2 text-sm font-normal">Your Intervoo account is ready.</p>
        </div>
      </div>
    </section>
  );
}
