import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "#/lib/auth.functions";

export const Route = createFileRoute("/profile-created")({
  beforeLoad: async () => {
    const session = await getSession();

    if (!session?.user) {
      throw redirect({ to: "/login" });
    }

    if (!session.user.hasCompletedOnboarding) {
      throw redirect({ to: "/onboarding" });
    }

    return { session };
  },
  component: ProfileCreatedPage,
});

function ProfileCreatedPage() {
  const { session } = Route.useRouteContext();
  const profile = session.user.profile;

  return (
    <main className="app-screen">
      <div className="mobile-shell">
        <section className="">
          <div className="created-hero">
            <span className="created-hero-icon">🎉</span>
            <h1 className="display-title display-title--compact">
              Profile <em>created!</em>
            </h1>
            <p className="support-copy">
              Pre-screening is now unlocked, {firstName(session.user.name)}.
            </p>
          </div>

          <div className="profile-preview-card">
            <div className="avatar-badge">👤</div>
            <div>
              <div className="profile-preview-name">{session.user.name}</div>
              <div className="profile-preview-meta">
                {profile?.institution ?? "Institution not added"}
              </div>
              <div className="profile-preview-submeta">
                {buildProfileSummary(profile?.degree, profile?.stream, profile?.yearOfStudy)}
              </div>
            </div>
          </div>
        </section>

        <section className="content-card profile-created-card">
          <div className="message-banner message-banner--green">
            <div className="message-banner-icon">💬</div>
            <div className="message-banner-copy">
              <strong>WhatsApp sent!</strong> Profile saved. Pre-screening is ready.
            </div>
          </div>

          <div className="button-row">
            <a className="primary-button" href="/pre-screening/native-language">
              Start Pre-screening →
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

function formatDegree(value?: string | null) {
  switch (value) {
    case "high_school":
      return "High School";
    case "diploma":
      return "Diploma";
    case "bachelor":
      return "Bachelor's";
    case "master":
      return "Master's";
    case "phd":
      return "PhD";
    case "other":
      return "Other";
    default:
      return value ?? "";
  }
}

function formatYear(value?: string | null) {
  switch (value) {
    case "1":
      return "1st Year";
    case "2":
      return "2nd Year";
    case "3":
      return "3rd Year";
    case "4":
      return "4th Year";
    case "5":
      return "5th Year";
    case "6":
      return "Final Year";
    case "completed":
      return "Graduate";
    default:
      return value ?? "";
  }
}

function buildProfileSummary(degree?: string | null, stream?: string | null, year?: string | null) {
  return [formatDegree(degree), stream ?? "", formatYear(year)].filter(Boolean).join(" · ");
}
