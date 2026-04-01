import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { completeOnboarding, getSession } from "#/lib/auth.functions";
import { cn } from "#/lib/utils";

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

const shellClassName = "mx-auto flex min-h-screen w-full max-w-[420px] flex-col px-4 py-6 sm:px-0";
const cardClassName =
  "rounded-3xl border border-slate-800/90 bg-slate-950/85 p-5 text-slate-100 shadow-[0_28px_60px_rgba(2,6,23,0.55)]";
const fieldStackClassName = "flex flex-col gap-2";
const labelClassName = "text-xs font-semibold uppercase tracking-[0.12em] text-slate-400";
const inputClassName =
  "h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30";

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_32%),radial-gradient(circle_at_left_bottom,rgba(56,189,248,0.16),transparent_24%),linear-gradient(180deg,#020617,#0f172a)] px-3 font-['Sora',sans-serif] text-slate-100">
      <div className={shellClassName}>
        <section className={cardClassName}>
          <h1 className="text-2xl leading-tight font-semibold text-slate-50">
            Build your <em className="not-italic text-amber-300">profile</em>
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Tell us who you are so the rest of the product can be personalized around your journey.
          </p>

          <div className="mt-5 space-y-4">
            {error ? (
              <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className={fieldStackClassName}>
                <span className={labelClassName}>Full name</span>
                <input
                  className={inputClassName}
                  placeholder="Aisha Patel"
                  required
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>

              <label className={fieldStackClassName}>
                <span className={labelClassName}>Email address</span>
                <input
                  className={inputClassName}
                  placeholder="aisha@example.com"
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <label className={fieldStackClassName}>
                <span className={labelClassName}>College / institution</span>
                <input
                  className={inputClassName}
                  placeholder="PSG College of Technology"
                  required
                  type="text"
                  value={college}
                  onChange={(event) => setCollege(event.target.value)}
                />
              </label>

              <label className={fieldStackClassName}>
                <span className={labelClassName}>Degree</span>
                <select
                  className={inputClassName}
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

              <label className={fieldStackClassName}>
                <span className={labelClassName}>Stream / branch</span>
                <input
                  className={inputClassName}
                  placeholder="Computer Science"
                  required
                  type="text"
                  value={stream}
                  onChange={(event) => setStream(event.target.value)}
                />
              </label>

              <div className={fieldStackClassName}>
                <span className={labelClassName}>Year of study</span>
                <div className="grid grid-cols-4 gap-2">
                  {yearOptions.map((option) => (
                    <button
                      key={option.value}
                      className={cn(
                        "h-10 rounded-xl border text-xs font-semibold transition",
                        yearOfStudy === option.value
                          ? "border-amber-300/50 bg-amber-400 text-slate-950"
                          : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500",
                      )}
                      type="button"
                      onClick={() => setYearOfStudy(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <input readOnly required className="hidden" tabIndex={-1} value={yearOfStudy} />
              </div>

              <div className="pt-2">
                <button
                  className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-amber-300/50 bg-amber-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={loading}
                  type="submit"
                >
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
