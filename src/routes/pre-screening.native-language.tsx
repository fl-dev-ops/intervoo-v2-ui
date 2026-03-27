import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { getSession } from "#/lib/auth.functions";
import { getPreScreeningSetup, savePreScreeningSetup } from "#/lib/pre-screening-setup";

const languageOptions = [
  { value: "tamil", label: "Tamil", nativeLabel: "தமிழ்" },
  { value: "hindi", label: "Hindi", nativeLabel: "हिन्दी" },
  { value: "telugu", label: "Telugu", nativeLabel: "తెలుగు" },
  { value: "kannada", label: "Kannada", nativeLabel: "ಕನ್ನಡ" },
  { value: "malayalam", label: "Malayalam", nativeLabel: "മലയാളം" },
  { value: "bengali", label: "Bengali", nativeLabel: "বাংলা" },
] as const;

export const Route = createFileRoute("/pre-screening/native-language")({
  beforeLoad: async () => {
    const session = await getSession();

    if (!session?.user) {
      throw redirect({ to: "/login" });
    }

    if (!session.user.hasCompletedOnboarding) {
      throw redirect({ to: "/onboarding" });
    }
  },
  component: NativeLanguagePage,
});

function NativeLanguagePage() {
  const [selected, setSelected] = useState(getPreScreeningSetup().nativeLanguage ?? "bengali");

  function handleContinue() {
    savePreScreeningSetup({ nativeLanguage: selected });
    window.location.href = "/pre-screening/english-level";
  }

  return (
    <main className="app-screen">
      <div className="mobile-shell">
        <div className="top-nav">
          <a className="back-button" href="/profile-created">
            ←
          </a>
        </div>

        <section className="content-card quick-setup-card">
          <div className="quick-setup-pill">⚙ Quick Setup · 1 of 3</div>
          <h1 className="display-title display-title--setup">
            What&apos;s your <em>native language?</em>
          </h1>
          <p className="support-copy support-copy--setup">
            Sana will use this to help you when you&apos;re stuck.
          </p>

          <div className="setup-option-stack">
            {languageOptions.map((option) => {
              const active = selected === option.value;

              return (
                <button
                  key={option.value}
                  className={`setup-option-card${active ? " is-active" : ""}`}
                  type="button"
                  onClick={() => setSelected(option.value)}
                >
                  <div className="setup-option-copy">
                    <div className="setup-option-title">
                      {option.label} <span>{option.nativeLabel}</span>
                    </div>
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
