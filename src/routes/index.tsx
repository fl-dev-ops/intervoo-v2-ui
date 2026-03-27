import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "#/lib/auth-client";
import { getSession } from "#/lib/auth.functions";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await getSession();

    if (session?.user && !session.user.hasCompletedOnboarding) {
      throw redirect({ to: "/onboarding" });
    }

    return { session };
  },
  component: HomePage,
});

function HomePage() {
  const { session } = Route.useRouteContext();
  const profile = session?.user?.profile;

  return (
    <main className="app-screen">
      <div className="mobile-shell">
        <section className="hero-card">
          <div className="brand-row">
            <div className="brand-mark">I</div>
            <div className="brand-wordmark">
              interv<span>oo</span>
            </div>
          </div>

          <div className="hero-accent">Placement readiness journey</div>
          <h1 className="display-title">
            Practice your <em>journey</em> with calm, guided steps.
          </h1>
          <p className="support-copy">
            Phone-first onboarding, focused preparation, and a cleaner student profile flow.
          </p>
        </section>

        {session?.user ? (
          <div className="content-stack">
            <section className="content-card">
              <div className="status-badge">Profile ready</div>
              <h2 className="section-title">
                Welcome back, <em>{session.user.name}</em>
              </h2>
              <p className="section-copy">
                Your account is verified and your onboarding details are saved. This home screen is
                now the base for the rest of the product experience.
              </p>
            </section>

            <section className="summary-card">
              <div className="card-label">Your profile</div>
              <div className="profile-grid">
                <div className="profile-row">
                  <span className="profile-key">Email</span>
                  <span className="profile-value">{session.user.email}</span>
                </div>
                <div className="profile-row">
                  <span className="profile-key">Phone</span>
                  <span className="profile-value">{session.user.phoneNumber ?? "Not added"}</span>
                </div>
                <div className="profile-row">
                  <span className="profile-key">Institution</span>
                  <span className="profile-value">{profile?.institution ?? "Not added"}</span>
                </div>
                <div className="profile-row">
                  <span className="profile-key">Degree</span>
                  <span className="profile-value">{profile?.degree ?? "Not added"}</span>
                </div>
                <div className="profile-row">
                  <span className="profile-key">Branch</span>
                  <span className="profile-value">{profile?.stream ?? "Not added"}</span>
                </div>
                <div className="profile-row">
                  <span className="profile-key">Year</span>
                  <span className="profile-value">{formatYear(profile?.yearOfStudy)}</span>
                </div>
              </div>
            </section>

            <section className="empty-state">
              <h3 className="empty-state-title">Next step</h3>
              <p className="empty-state-copy">
                Your onboarding is complete. Continue into the pre-screening intro flow when you are
                ready.
              </p>
            </section>

            <a className="primary-button" href="/pre-screening/native-language">
              Open pre-screening
            </a>

            <button
              className="secondary-button"
              onClick={() => authClient.signOut().then(() => window.location.reload())}
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="content-stack">
            <section className="content-card">
              <div className="button-row" style={{ marginTop: "18px" }}>
                <a className="primary-button" href="/register">
                  Get started
                </a>
                <a className="secondary-button" href="/login">
                  I already have an account
                </a>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function formatYear(value?: string | null) {
  if (!value) return "Not added";

  switch (value) {
    case "1":
      return "1st year";
    case "2":
      return "2nd year";
    case "3":
      return "3rd year";
    case "4":
      return "4th year";
    case "5":
      return "5th year";
    case "6":
      return "Final year";
    case "completed":
      return "Completed";
    default:
      return value;
  }
}
