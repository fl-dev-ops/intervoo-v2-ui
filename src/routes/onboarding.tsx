import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { completeOnboarding, getSession } from "#/lib/auth.functions";

const yearOptions = [
  { value: "1", label: "1st" },
  { value: "2", label: "2nd" },
  { value: "3", label: "3rd" },
  { value: "4", label: "4th" },
  { value: "5", label: "5th" },
  { value: "6", label: "Final" },
  { value: "completed", label: "Graduate" },
] as const;

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async () => {
    const session = await getSession();

    if (!session?.user) {
      throw redirect({ to: "/login" });
    }

    if (session.user.hasCompletedOnboarding) {
      throw redirect({ to: "/" });
    }

    return { session };
  },
  component: OnboardingPage,
});

function OnboardingPage() {
  const { session } = Route.useRouteContext();
  const [name, setName] = useState(isPlaceholderName(session.user.name) ? "" : session.user.name);
  const [email, setEmail] = useState(
    isPlaceholderEmail(session.user.email) ? "" : session.user.email,
  );
  const [college, setCollege] = useState(session.user.profile?.institution ?? "");
  const [degree, setDegree] = useState(session.user.profile?.degree ?? "");
  const [stream, setStream] = useState(session.user.profile?.stream ?? "");
  const [yearOfStudy, setYearOfStudy] = useState(session.user.profile?.yearOfStudy ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await completeOnboarding({
        data: {
          name,
          email,
          institution: college,
          degree,
          stream,
          yearOfStudy,
        },
      });

      window.location.href = "/profile-created";
    } catch {
      setError("Something went wrong while saving your profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-screen">
      <div className="mobile-shell">
        <section className="content-card" style={{ marginTop: "16px" }}>
          <h1 className="display-title">
            Build your <em>profile</em>
          </h1>
          <p className="support-copy">
            Tell us who you are so the rest of the product can be personalized around your journey.
          </p>

          <div className="content-stack">
            {error ? <div className="alert alert-danger">{error}</div> : null}

            <form className="page-form" onSubmit={handleSubmit}>
              <label className="field-stack">
                <span className="field-label">Full name</span>
                <input
                  className="text-input"
                  placeholder="Aisha Patel"
                  required
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>

              <label className="field-stack">
                <span className="field-label">Email address</span>
                <input
                  className="text-input"
                  placeholder="aisha@example.com"
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <label className="field-stack">
                <span className="field-label">College / institution</span>
                <input
                  className="text-input"
                  placeholder="PSG College of Technology"
                  required
                  type="text"
                  value={college}
                  onChange={(event) => setCollege(event.target.value)}
                />
              </label>

              <label className="field-stack">
                <span className="field-label">Degree</span>
                <select
                  className="text-select"
                  required
                  value={degree}
                  onChange={(event) => setDegree(event.target.value)}
                >
                  <option value="">Select degree</option>
                  <option value="high_school">High School</option>
                  <option value="diploma">Diploma</option>
                  <option value="bachelor">Bachelor's</option>
                  <option value="master">Master's</option>
                  <option value="phd">PhD</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label className="field-stack">
                <span className="field-label">Stream / branch</span>
                <input
                  className="text-input"
                  placeholder="Computer Science"
                  required
                  type="text"
                  value={stream}
                  onChange={(event) => setStream(event.target.value)}
                />
              </label>

              <div className="field-stack">
                <span className="field-label">Year of study</span>
                <div className="year-grid">
                  {yearOptions.map((option) => (
                    <button
                      key={option.value}
                      className={`year-chip${yearOfStudy === option.value ? " is-active" : ""}`}
                      type="button"
                      onClick={() => setYearOfStudy(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <input
                  readOnly
                  required
                  style={{ display: "none" }}
                  tabIndex={-1}
                  value={yearOfStudy}
                />
              </div>

              <div className="button-row" style={{ marginTop: "8px" }}>
                <button className="primary-button" disabled={loading} type="submit">
                  {loading ? "Saving profile..." : "Save profile"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

function isPlaceholderEmail(value: string) {
  return value.endsWith("@otp.foreverlearning.local");
}

function isPlaceholderName(value: string) {
  return value.startsWith("+");
}
