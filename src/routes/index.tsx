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

const shellClassName =
  "mx-auto flex min-h-screen w-full max-w-[420px] flex-col gap-4 px-4 py-6 sm:px-0";
const cardClassName =
  "rounded-3xl border border-slate-800/90 bg-slate-950/85 p-5 text-slate-100 shadow-[0_28px_60px_rgba(2,6,23,0.55)]";
const primaryButtonClassName =
  "inline-flex w-full items-center justify-center rounded-2xl border border-amber-300/50 bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButtonClassName =
  "inline-flex w-full items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";

function HomePage() {
  const { session } = Route.useRouteContext();
  const profile = session?.user?.profile;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_32%),radial-gradient(circle_at_left_bottom,rgba(56,189,248,0.16),transparent_24%),linear-gradient(180deg,#020617,#0f172a)] px-3 font-['Sora',sans-serif] text-slate-100">
      <div className={shellClassName}>
        <section className={cardClassName}>
          <div className="mb-5 inline-flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full border border-amber-300/40 bg-amber-400/20 text-sm font-semibold text-amber-200">
              I
            </div>
            <div className="text-sm font-semibold tracking-wide text-slate-200">
              interv<span className="text-amber-300">oo</span>
            </div>
          </div>

          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
            Placement readiness journey
          </div>
          <h1 className="mt-3 text-2xl leading-tight font-semibold text-slate-50">
            Practice your <em className="not-italic text-amber-300">journey</em> with calm, guided
            steps.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Phone-first onboarding, focused preparation, and a cleaner student profile flow.
          </p>
        </section>

        {session?.user ? (
          <div className="space-y-4">
            <section className={cardClassName}>
              <div className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
                Profile ready
              </div>
              <h2 className="mt-3 text-lg leading-tight font-semibold text-slate-50">
                Welcome back, <em className="not-italic text-amber-300">{session.user.name}</em>
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Your account is verified and your onboarding details are saved. This home screen is
                now the base for the rest of the product experience.
              </p>
            </section>

            <section className={cardClassName}>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Your profile
              </div>
              <div className="mt-4 space-y-2">
                {[
                  ["Email", session.user.email],
                  ["Phone", session.user.phoneNumber ?? "Not added"],
                  ["Institution", profile?.institution ?? "Not added"],
                  ["Degree", profile?.degree ?? "Not added"],
                  ["Branch", profile?.stream ?? "Not added"],
                  ["Year", formatYear(profile?.yearOfStudy)],
                ].map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-900/70 px-3 py-2"
                  >
                    <span className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">
                      {key}
                    </span>
                    <span className="text-sm text-slate-100">{value}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className={cardClassName}>
              <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-300">
                Next step
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Your onboarding is complete. Continue into the pre-screening intro flow when you are
                ready.
              </p>
            </section>

            <a className={primaryButtonClassName} href="/pre-screening">
              Open pre-screening
            </a>

            <button
              className={secondaryButtonClassName}
              onClick={() => authClient.signOut().then(() => window.location.reload())}
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <section className={cardClassName}>
              <div className="mt-1 space-y-3">
                <a className={primaryButtonClassName} href="/register">
                  Get started
                </a>
                <a className={secondaryButtonClassName} href="/login">
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
