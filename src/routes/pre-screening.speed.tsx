import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSession } from "#/lib/auth.functions";
import { getPreScreeningSetup, savePreScreeningSetup } from "#/lib/pre-screening-setup";

const speedOptions = [
  {
    value: "normal",
    label: "Normal",
    speed: "1x",
    description: "Recommended - natural interview pace",
    icon: "▶",
    iconClassName: "setup-speed-icon setup-speed-icon--green",
  },
  {
    value: "relaxed",
    label: "Relaxed",
    speed: ".7x",
    description: "A bit slower - easier to follow",
    icon: "▷",
    iconClassName: "setup-speed-icon setup-speed-icon--blue",
  },
  {
    value: "slow",
    label: "Slow",
    speed: ".5x",
    description: "For those just getting started with English",
    icon: "▷",
    iconClassName: "setup-speed-icon setup-speed-icon--purple",
  },
] as const;

export const Route = createFileRoute("/pre-screening/speed")({
  beforeLoad: async () => {
    const session = await getSession();

    if (!session?.user) {
      throw redirect({ to: "/login" });
    }

    if (!session.user.hasCompletedOnboarding) {
      throw redirect({ to: "/onboarding" });
    }
  },
  component: SpeedPage,
});

function SpeedPage() {
  const setup = getPreScreeningSetup();
  const [selected, setSelected] = useState(setup.speakingSpeed ?? "normal");

  useEffect(() => {
    if (!setup.nativeLanguage) {
      window.location.href = "/pre-screening/native-language";
      return;
    }

    if (!setup.englishLevel) {
      window.location.href = "/pre-screening/english-level";
    }
  }, [setup.englishLevel, setup.nativeLanguage]);

  function handleContinue() {
    savePreScreeningSetup({ speakingSpeed: selected });
    window.location.href = "/pre-screening";
  }

  return (
    <main className="app-screen">
      <div className="mobile-shell">
        <div className="top-nav">
          <a className="back-button" href="/pre-screening/english-level">
            ←
          </a>
        </div>

        <section className="content-card quick-setup-card">
          <div className="quick-setup-pill">⚙ Quick Setup · 3 of 3</div>

          <div>
            <div className="speed-hero-icon">🤖</div>
          </div>

          <h1 className="display-title display-title--setup">
            How fast should <em>Sana</em> speak?
          </h1>
          <p className="support-copy">You can always change this later in Settings.</p>

          <div className="setup-option-stack">
            {speedOptions.map((option) => {
              const active = selected === option.value;

              return (
                <button
                  key={option.value}
                  className={`setup-option-card setup-option-card--detailed${active ? " is-active" : ""}`}
                  type="button"
                  onClick={() => setSelected(option.value)}
                >
                  <div className={option.iconClassName}>{option.icon}</div>
                  <div className="setup-option-copy">
                    <div className="setup-option-title">
                      {option.label} <span>{option.speed}</span>
                    </div>
                    <div className="setup-option-description">{option.description}</div>
                  </div>
                  <div className={`setup-option-check${active ? " is-active" : ""}`}>
                    {active ? "✓" : ""}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="button-row quick-setup-actions">
            <button className="primary-button" type="button" onClick={handleContinue}>
              Done - Meet Sana →
            </button>
          </div>
          <div className="guide-footer-note">3 of 3 complete · All set!</div>
        </section>
      </div>
    </main>
  );
}
