import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { getPreScreeningSetup, hasCompletedPreScreeningSetup } from "#/lib/pre-screening-setup";

export const Route = createFileRoute("/pre-screening/")({
  component: PreScreeningPage,
});

function PreScreeningPage() {
  useEffect(() => {
    if (!hasCompletedPreScreeningSetup(getPreScreeningSetup())) {
      window.location.href = "/pre-screening/native-language";
    }
  }, []);

  return (
    <main className="app-screen">
      <div className="mobile-shell">
        <div className="top-nav">
          <a className="back-button" href="/pre-screening/speed">
            ←
          </a>
          <div className="top-nav-copy">
            <div className="top-nav-label">Pre-screening</div>
          </div>
        </div>

        <section className="content-card pre-screen-context-card">
          <div className="guide-avatar">🤖</div>
          <div className="guide-title">
            Meet <em>Sana</em>
          </div>
          <div className="guide-subtitle">Your AI Pre-screening Guide</div>

          <div className="voice-message-card">
            <div className="voice-message-header">
              <div className="voice-pill-icon">〰</div>
              <span>Sana · AI Voice</span>
              <span className="voice-speaker">🔊</span>
            </div>
            <div className="voice-message-copy">
              "Tell me about the jobs you're targeting - I'll use that to{" "}
              <strong>build your personalised Diagnostic Interview.</strong>"
            </div>
          </div>

          <div className="guide-meta">⏱ 5-7 minutes · 2 sections</div>

          <div className="section-list-label">2 sections</div>

          <div className="section-flow-card section-flow-card--amber">
            <div className="section-flow-icon">🎯</div>
            <div>
              <div className="section-flow-title section-flow-title--amber">Job Plans</div>
              <div className="section-flow-copy">
                What jobs you're aiming for, dream, backup - and <em>why</em> each one
              </div>
            </div>
          </div>

          <div className="section-connector" />

          <div className="section-flow-card section-flow-card--blue">
            <div className="section-flow-icon section-flow-icon--blue">🔍</div>
            <div>
              <div className="section-flow-title section-flow-title--blue">Job Research</div>
              <div className="section-flow-copy">
                What you know about those jobs - companies, seniors, skills, pay, tools
              </div>
            </div>
          </div>

          <div className="section-connector" />

          <div className="section-result-card">
            <div className="section-result-icon">📋</div>
            <div className="section-result-copy">
              Personalised Diagnostic Interview built for your job targets
            </div>
          </div>

          <div className="button-row" style={{ marginTop: "18px" }}>
            <button className="primary-button primary-button--pill" type="button">
              🎙️ Start Conversation
            </button>
          </div>
          <div className="guide-footer-note">Speak naturally · no right or wrong answers</div>
        </section>
      </div>
    </main>
  );
}
