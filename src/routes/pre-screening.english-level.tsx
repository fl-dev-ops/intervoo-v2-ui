import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSession } from "#/lib/auth.functions";
import { getPreScreeningSetup, savePreScreeningSetup } from "#/lib/pre-screening-setup";

const englishLevels = [
  {
    value: "beginner",
    label: "Beginner",
    description: "I struggle to speak in English. Basic words only.",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "I can hold a basic conversation but make mistakes.",
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "Fluent in most situations, minor gaps.",
  },
  {
    value: "native",
    label: "Native / Near-native",
    description: "Fully comfortable speaking English.",
  },
] as const;

export const Route = createFileRoute("/pre-screening/english-level")({
  beforeLoad: async () => {
    const session = await getSession();

    if (!session?.user) {
      throw redirect({ to: "/login" });
    }

    if (!session.user.hasCompletedOnboarding) {
      throw redirect({ to: "/onboarding" });
    }
  },
  component: EnglishLevelPage,
});

function EnglishLevelPage() {
  const setup = getPreScreeningSetup();
  const [selected, setSelected] = useState(setup.englishLevel ?? "intermediate");

  useEffect(() => {
    if (!setup.nativeLanguage) {
      window.location.href = "/pre-screening/native-language";
    }
  }, [setup.nativeLanguage]);

  function handleContinue() {
    savePreScreeningSetup({ englishLevel: selected });
    window.location.href = "/pre-screening/speed";
  }

  return (
    <main className="app-screen">
      <div className="mobile-shell">
        <div className="top-nav">
          <a className="back-button" href="/pre-screening/native-language">
            ←
          </a>
        </div>

        <section className="content-card quick-setup-card">
          <div className="quick-setup-pill">⚙ Quick Setup · 2 of 3</div>
          <h1 className="display-title display-title--setup">
            Your <em>English level</em> right now?
          </h1>
          <p className="support-copy support-copy--setup">
            Sana will adjust to match you. Your actual level gets measured in the Diagnostic
            Interview.
          </p>
          <p className="setup-hint">💡 No right answer - just pick what feels true today.</p>

          <div className="setup-option-stack">
            {englishLevels.map((option) => {
              const active = selected === option.value;

              return (
                <button
                  key={option.value}
                  className={`setup-option-card setup-option-card--detailed${active ? " is-active" : ""}`}
                  type="button"
                  onClick={() => setSelected(option.value)}
                >
                  <div className="setup-option-copy">
                    <div className="setup-option-title">{option.label}</div>
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
              Continue →
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
