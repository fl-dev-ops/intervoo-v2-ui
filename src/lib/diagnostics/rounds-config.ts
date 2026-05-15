export type DiagnosticRoundConfig = {
  id: string;
  title: string;
  description: string;
  duration: string;
  eyebrow: string;
  questions: string[];
  questionsByBand: Record<"band1" | "band2" | "band3", string[]>;
  iconName: string;
  color: string;
};

export const DIAGNOSTIC_ROUNDS: DiagnosticRoundConfig[] = [
  {
    id: "screening",
    title: "Screening",
    description:
      "This round evaluates your background, communication clarity, and career intent. You’ll introduce yourself, talk about your interests, and explain the roles you're aiming for.",
    duration: "15 min",
    eyebrow: "Round 1",
    questions: [
      "Education background",
      "Career goals",
      "Personal interests",
      "Projects & experience",
      "Motivation",
    ],
    questionsByBand: {
      band1: [
        "Name & hometown",
        "College & branch",
        "Hobbies",
        "Strengths",
        "Why CS",
      ],
      band2: [
        "Academic background",
        "Work you enjoy",
        "Why CS",
        "Working style",
        "Five-year vision",
      ],
      band3: [
        "Engineering journey",
        "Most complex build",
        "Why CS",
        "Technical strengths",
        "Where you're headed",
      ],
    },
    iconName: "user-check",
    color: "purple",
  },
  {
    id: "behavioural",
    title: "Behavioural",
    description:
      "Evaluates how you think, communicate, and respond in workplace situations. Focus on explaining your decisions clearly and confidently.",
    duration: "15 min",
    eyebrow: "Round 2",
    questions: [
      "Conflict handling",
      "Teamwork",
      "Decision making",
      "STAR answers",
      "Ownership",
    ],
    questionsByBand: {
      band1: [
        "Following instructions",
        "Group projects",
        "Missed deadlines",
        "Handling criticism",
        "Trying new things",
      ],
      band2: [
        "Tight deadlines",
        "Technical disagreements",
        "Pushing back on seniors",
        "Shifting requirements",
        "Wrong decisions",
      ],
      band3: [
        "Leading without authority",
        "Difficult feedback",
        "Ethical concerns",
        "Unpopular decisions",
        "Ownership",
      ],
    },
    iconName: "eye-search",
    color: "blue",
  },
  {
    id: "technical-thinking",
    title: "Technical",
    description:
      "Focuses on your technical understanding, structured thinking, and ability to explain concepts clearly based on your target role.",
    duration: "15 min",
    eyebrow: "Round 3",
    questions: [
      "Technical fundamentals",
      "Problem solving",
      "Projects",
      "Trade-offs",
      "Role-specific depth",
    ],
    questionsByBand: {
      band1: [
        "OOP basics",
        "Database & SQL",
        "API fundamentals",
        "Cloud & OS basics",
        "Project walkthrough",
      ],
      band2: [
        "OOP basics",
        "Memory & systems",
        "Database internals",
        "System design",
        "Scaling & caching",
      ],
      band3: [
        "Concurrency & threads",
        "OS & memory internals",
        "Distributed systems",
        "Large-scale design",
        "Trade-offs & depth",
      ],
    },
    iconName: "code-asterisk",
    color: "amber",
  },
  {
    id: "career-readiness",
    title: "Culture fit",
    description:
      "Evaluates your confidence, self-awareness, and readiness for interviews. You’ll reflect on your strengths, growth areas, and career direction.",
    duration: "15 min",
    eyebrow: "Round 4",
    questions: [
      "Self-awareness",
      "Interview readiness",
      "Strengths",
      "Growth areas",
      "Next steps",
    ],
    questionsByBand: {
      band1: [
        "Relocation & bond",
        "Salary expectations",
        "Joining date",
        "Company awareness",
        "Three-year plan",
      ],
      band2: [
        "Product company fit",
        "Strengths & gaps",
        "Ideal manager",
        "First-month plan",
        "Why this company",
      ],
      band3: [
        "Motivation",
        "Self-assessment",
        "Year-one challenges",
        "Engineering standards",
        "What sets you apart",
      ],
    },
    iconName: "user-group",
    color: "emerald",
  },
] as const;

export const ROUND_ORDER = DIAGNOSTIC_ROUNDS.map((r) => r.id);

export function getRoundConfig(
  roundId: string,
): DiagnosticRoundConfig | undefined {
  return DIAGNOSTIC_ROUNDS.find((r) => r.id === roundId);
}

export function getRoundNumber(roundId: string): number {
  return ROUND_ORDER.indexOf(roundId) + 1;
}
