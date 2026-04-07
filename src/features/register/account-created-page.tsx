import { useEffect } from "react";
import confetti from "@hiseb/confetti";
import { IconCheck } from "@tabler/icons-react";

type AccountCreatedPageProps = {
  onContinue: () => void;
};

export function AccountCreatedPage(props: AccountCreatedPageProps) {
  useEffect(() => {
    const xPositions = [0.18, 0.35, 0.5, 0.65, 0.82];
    xPositions.forEach((x) => {
      confetti({
        position: { x: window.innerWidth * x, y: 0 },
        count: 30,
        size: 1.1,
        velocity: 180,
        fade: false,
      });
    });
  }, []);

  return (
    <section className="relative min-h-screen">
      {/* Desktop: centered card */}
      <div className="hidden min-h-screen md:flex md:items-center md:justify-center md:px-6">
        <div className="flex w-full max-w-[420px] flex-col items-center rounded-4xl bg-white px-8 py-16 shadow-xl text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#efeaf5]">
            <IconCheck className="h-12 w-12" />
          </div>
          <h2 className="mt-7 text-3xl font-semibold">Congratulations!</h2>
          <p className="mt-2 text-sm font-normal text-gray-500">Your Intervoo account is ready.</p>
          <button
            className="mx-auto mt-8 w-fit px-14 py-4 rounded-full bg-[linear-gradient(90deg,#4F33A3_0%,#6A4DF5_100%)] text-base font-medium tracking-wide text-white shadow-[0_12px_24px_rgba(93,72,220,0.28)] transition"
            type="button"
            onClick={props.onContinue}
          >
            Setup my profile
          </button>
        </div>
      </div>

      {/* Mobile: full-screen white */}
      <div className="flex h-screen flex-col items-center justify-between bg-white md:hidden">
        <div className="flex flex-col items-center mt-30">
          <div className="mt-4 flex h-24 w-24 items-center justify-center rounded-full bg-[#efeaf5]">
            <IconCheck className="h-12 w-12" />
          </div>
          <h2 className="mt-7 text-3xl font-semibold ">Congratulations!</h2>
          <p className="mt-2 text-sm font-normal">Your Intervoo account is ready.</p>
          <button
            className="mx-auto mt-8 w-fit px-14 py-4 rounded-full bg-[linear-gradient(90deg,#4F33A3_0%,#6A4DF5_100%)] text-base font-medium tracking-wide text-white shadow-[0_12px_24px_rgba(93,72,220,0.28)] transition"
            type="button"
            onClick={props.onContinue}
          >
            Setup my profile
          </button>
        </div>
      </div>
    </section>
  );
}
