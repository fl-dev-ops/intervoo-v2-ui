import { useState } from "react";
import { ChevronDown, ChevronUp, Languages, Lightbulb, Smile, Target } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
  getDiagnosticJobOption,
  type DiagnosticBand,
  type DiagnosticJobOption,
} from "#/lib/diagnostics/job-options";

type DiagnosticsReportPageProps = {
  band: DiagnosticBand;
  options: DiagnosticJobOption[];
  profile: {
    name: string;
    degree?: string | null;
    stream?: string | null;
    institution?: string | null;
  };
};

const DETAIL_SECTIONS = [
  {
    key: "language",
    title: "Language proficiency",
    level: "MID",
    tone: "amber",
    icon: <Languages className="h-5 w-5" />,
    summary:
      "Your fluency is functional but uneven. You occasionally restart sentences and fall back on repeated connectors.",
    items: [
      {
        title: "Flow & Fluency",
        body: "Your speech felt smooth, and you stopped and restarted a lot",
        tag: "Uneven",
        tone: "red",
      },
      {
        title: "Grammar & Accuracy",
        body: "Your grammar and sentences have slightly wrong structure and tense",
        tag: "Weak",
        tone: "red",
      },
      {
        title: "Coherence & Ideas",
        body: "Your ideas connect well. Use a variety of words.",
        tag: "Steady",
        tone: "green",
      },
    ],
  },
  {
    key: "thinking",
    title: "Thinking",
    level: "HIGH",
    tone: "green",
    icon: <Lightbulb className="h-5 w-5" />,
    summary:
      "Your thinking ability is strong and well-structured, and you approach problems logically.",
    items: [
      {
        title: "Relevance & Accuracy",
        body: "Your answers stay relevant and aligned with the question asked",
        tag: "Steady",
        tone: "green",
      },
      {
        title: "Structured Thinking",
        body: "You organize your thoughts logically, though minor sentence errors affect clarity",
        tag: "Strong",
        tone: "purple",
      },
      {
        title: "Idea Development",
        body: "Your ideas flow well; adding more varied vocabulary can strengthen responses",
        tag: "Strong",
        tone: "purple",
      },
    ],
  },
  {
    key: "confidence",
    title: "Confidence",
    level: "LOW",
    tone: "red",
    icon: <Smile className="h-5 w-5" />,
    summary:
      "You have a good foundation, but improving delivery consistency, pacing, and response start can significantly boost your confidence.",
    items: [
      {
        title: "Loudness",
        body: "Consistency in volume can improve overall impact",
        tag: "Uneven",
        tone: "red",
      },
      {
        title: "Speed",
        body: "Your pace is comfortable, but lacks a steady rhythm",
        tag: "Strong",
        tone: "purple",
      },
      {
        title: "Pauses",
        body: "Using intentional pauses can improve clarity and confidence",
        tag: "Uneven",
        tone: "red",
      },
      {
        title: "Start time",
        body: "You take time to begin responses",
        tag: "Weak",
        tone: "red",
      },
    ],
  },
] as const;

const RECOMMENDED_ROLES = [
  {
    salary: "₹2-4 LPA",
    title: "Core Engineering Entry Level",
    description: "Build a strong foundation for your career in regional manufacturing hubs.",
    companies: ["L&T", "Bosch", "Reliance"],
  },
  {
    salary: "₹4-6 LPA",
    title: "Product Engineering Associate",
    description:
      "Practice structured problem solving for entry-level product and engineering teams.",
    companies: ["Adobe", "Zomato", "Flipkart"],
  },
] as const;

export function DiagnosticsReportPage(props: DiagnosticsReportPageProps) {
  const selectedOption = getDiagnosticJobOption(props.options, props.band);
  const education = [props.profile.degree, props.profile.stream, props.profile.institution]
    .filter(Boolean)
    .join(", ");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    language: false,
    thinking: false,
    confidence: true,
  });

  return (
    <main className="min-h-screen bg-[#F5F3F7]">
      <div className="bg-[linear-gradient(180deg,#100725_0%,#3C2390_100%)] px-4 pt-8 pb-26 text-center text-white">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">{props.profile.name}</h1>
        {education ? <p className="mt-1 text-sm text-white/60">{education}</p> : null}
        <p className="mt-8 text-base font-semibold">Diagnostic Report</p>
      </div>

      <div className="mx-auto -mt-18 w-full max-w-4xl px-4 pb-10">
        <section className="rounded-[1.25rem] bg-white p-5 shadow-[0_18px_48px_rgba(73,57,122,0.1)] sm:p-6">
          <h2 className="text-base font-semibold text-black uppercase">
            Interview readiness score
          </h2>

          <div className="mt-5 rounded-[1rem] border border-[#d9e3ec] bg-[#eef8ff] p-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_13rem]">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-semibold text-black">
                    {selectedOption?.title ?? "Selected job"}
                  </h3>
                  <span className="rounded-full border border-[#f1e2da] bg-white px-3 py-1.5 text-sm font-semibold">
                    {selectedOption?.salary ?? "₹10-20 LPA"}
                  </span>
                </div>
                <p className="mt-3 max-w-2xl text-base leading-6 text-[#6f667d]">
                  {selectedOption?.description}
                </p>
                <div className="mt-4 inline-flex max-w-full rounded-full border border-[#b7d4e5] bg-[#e4f4ff] px-3 py-1 text-sm text-black">
                  <span className="truncate">{selectedOption?.companies.join(", ")}</span>
                </div>
              </div>
              <div className="text-left lg:text-right">
                <p className="text-sm text-[#5f5c67]">Interview Readiness Score</p>
                <p className="mt-2 text-4xl font-semibold text-black">44%</p>
                <span className="mt-3 inline-flex rounded-full border border-[#ff9fa0] bg-[#fff2f1] px-3 py-1.5 text-sm font-semibold text-[#df4d50]">
                  Not Match Yet
                </span>
              </div>
            </div>
          </div>

          <h3 className="mt-6 text-base font-semibold text-black">
            Section wise interview performance
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PerformancePill label="Opener" value="Good" tone="green" />
            <PerformancePill label="Situational behavioural" value="Poor" tone="red" />
            <PerformancePill label="Domain" value="Good" tone="green" />
            <PerformancePill label="Closure" value="Poor" tone="red" />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-base font-semibold text-black">YOUR TRAINING PLAN</h2>
          <div className="mt-4 flex flex-col gap-4 rounded-[1.25rem] border border-dashed border-[#bda8dc] bg-[#f2ecfb] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-black">Recommended Training Plan</h3>
              <p className="mt-1.5 text-sm text-[#777281]">
                Based on your results, we&apos;ve created a plan to help you reach B2.
              </p>
            </div>
            <Button className="h-11 px-6 text-sm">View Practice Plan</Button>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-base font-semibold text-black">DETAILED REPORT</h2>
          <div className="mt-4 space-y-4">
            {DETAIL_SECTIONS.map((section) => (
              <ReportSection
                key={section.key}
                section={section}
                open={openSections[section.key] ?? false}
                onToggle={() =>
                  setOpenSections((current) => ({
                    ...current,
                    [section.key]: !current[section.key],
                  }))
                }
              />
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-base font-semibold text-black">JOB ROLES THAT YOU CAN CONSIDER</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            {RECOMMENDED_ROLES.map((role) => (
              <RecommendedRoleCard key={role.salary} role={role} />
            ))}
          </div>
        </section>

        <div className="mt-10 rounded-[1rem] border border-[#f1e7a6] bg-[#fffbe4] px-5 py-4 text-sm leading-6 text-[#6f667d]">
          <div className="flex gap-2.5">
            <span aria-hidden="true" className="mt-0.5 text-[#e2b933]">
              ⚠
            </span>
            <p>
              <span className="font-semibold text-[#5f5c67]">NOTE :</span> We haven&apos;t evaluated
              your subject knowledge or domain depth. This is purely based on T, L, &amp; C Skills.
              The soft skills any HR or non-domain interviewer guages in entry-level interviews.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function PerformancePill(props: { label: string; value: string; tone: "green" | "red" }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-full bg-[#f7f7f8] px-4 py-2 text-base">
      <span>{props.label}</span>
      <LevelBadge label={props.value} tone={props.tone} />
    </div>
  );
}

function ReportSection(props: {
  section: (typeof DETAIL_SECTIONS)[number];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="rounded-[1.25rem] bg-white p-4 shadow-[0_12px_28px_rgba(73,57,122,0.07)]">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 text-left"
        onClick={props.onToggle}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4f0ff] text-[#6A4DF5]">
            {props.section.icon}
          </span>
          <h3 className="text-base font-semibold text-black">{props.section.title}</h3>
        </div>
        <div className="flex items-center gap-3">
          <LevelBadge label={`Level - ${props.section.level}`} tone={props.section.tone} />
          {props.open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </button>

      {props.open ? (
        <div className="mt-4">
          <div className="grid gap-3 md:grid-cols-3">
            {props.section.items.map((item) => (
              <MetricCard key={item.title} item={item} />
            ))}
          </div>
          <p className="mt-4 text-base leading-6 text-[#6f667d]">
            <strong className="text-black">Summary:</strong> {props.section.summary}
          </p>
        </div>
      ) : null}
    </article>
  );
}

function MetricCard(props: {
  item: { title: string; body: string; tag: string; tone: "red" | "green" | "purple" };
}) {
  return (
    <div className="rounded-[1rem] border border-[#e5e0ed] p-3.5 shadow-sm">
      <Target className="h-5 w-5 text-[#8f8c96]" />
      <h4 className="mt-3 text-base font-semibold text-black">{props.item.title}</h4>
      <p className="mt-1.5 min-h-12 text-sm leading-5 text-[#6f667d]">{props.item.body}</p>
      <LevelBadge className="mt-4" label={props.item.tag} tone={props.item.tone} />
    </div>
  );
}

function RecommendedRoleCard(props: { role: (typeof RECOMMENDED_ROLES)[number] }) {
  return (
    <article className="rounded-[1rem] border border-[#e7e0ed] bg-white p-5 shadow-[0_10px_24px_rgba(73,57,122,0.08)]">
      <span className="inline-flex rounded-full border border-[#f1e6df] bg-[#fffaf7] px-3 py-1.5 text-sm font-medium text-[#2b2233]">
        {props.role.salary}
      </span>
      <h3 className="mt-4 text-lg font-semibold tracking-[-0.01em] text-black">
        {props.role.title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-[#6f667d]">{props.role.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {props.role.companies.map((company) => (
          <span
            key={company}
            className="rounded-full bg-[#fff4e7] px-3 py-1 text-xs text-[#4f465a]"
          >
            {company}
          </span>
        ))}
      </div>
      <Button variant="outline" className="mt-6 w-full">
        Take Diagnostic
      </Button>
    </article>
  );
}

function LevelBadge(props: {
  label: string;
  tone: "green" | "red" | "purple" | "amber";
  className?: string;
}) {
  const classNameByTone: Record<typeof props.tone, string> = {
    green: "border-[#b9edca] bg-[#e8fbef] text-[#31aa55]",
    red: "border-[#ffd9d7] bg-[#fff1ef] text-[#d45757]",
    purple: "border-[#e2d7ff] bg-[#f2ecff] text-[#7558bd]",
    amber: "border-[#ead6bd] bg-[#fffaf4] text-[#d18a00]",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${classNameByTone[props.tone]} ${props.className ?? ""}`}
    >
      {props.label}
    </span>
  );
}
