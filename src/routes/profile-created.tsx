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

const shellClassName =
  "mx-auto flex min-h-screen w-full max-w-[420px] flex-col gap-4 px-4 py-6 sm:px-0";
const cardClassName =
  "rounded-3xl border border-slate-800/90 bg-slate-950/85 p-5 text-slate-100 shadow-[0_28px_60px_rgba(2,6,23,0.55)]";

function ProfileCreatedPage() {
  const { session } = Route.useRouteContext();
  const profile = session.user.profile;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_32%),radial-gradient(circle_at_left_bottom,rgba(56,189,248,0.16),transparent_24%),linear-gradient(180deg,#020617,#0f172a)] px-3 font-['Sora',sans-serif] text-slate-100">
      <div className={shellClassName}>
        <section className={cardClassName}>
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full border border-amber-300/30 bg-amber-400/15 text-2xl">
            🎉
          </div>
          <h1 className="text-center text-2xl leading-tight font-semibold text-slate-50">
            Profile <em className="not-italic text-amber-300">created!</em>
          </h1>
          <p className="mt-3 text-center text-sm leading-6 text-slate-300">
            Pre-screening is now unlocked, {firstName(session.user.name)}.
          </p>

          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-slate-800 text-base">
              👤
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-100">{session.user.name}</div>
              <div className="text-xs text-slate-400">
                {profile?.institution ?? "Institution not added"}
              </div>
              <div className="text-xs text-slate-500">
                {buildProfileSummary(profile?.degree, profile?.stream, profile?.yearOfStudy)}
              </div>
            </div>
          </div>
        </section>

        <section className={cardClassName}>
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            <div className="text-base">💬</div>
            <div>
              <strong>WhatsApp sent!</strong> Profile saved. Pre-screening is ready.
            </div>
          </div>

          <div>
            <a
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-amber-300/50 bg-amber-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
              href="/pre-screening"
            >
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
