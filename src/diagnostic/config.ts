import type { PreScreeningSetup } from "#/lib/pre-screening-setup";

export const PRE_SCREENING_AGENT_TYPE = "pre_screen_agent" as const;

export type PreScreeningSectionCard = {
  id: string;
  title: string;
  description: string;
  icon: string;
  tone: "amber" | "blue";
};

export type PreScreeningAgentQuestion = {
  identifier: string;
  text: string;
  description: string;
  hint: string;
};

export type PreScreeningProfileSummary = {
  institution?: string | null;
  degree?: string | null;
  stream?: string | null;
  yearOfStudy?: string | null;
};

export type PreScreeningRoomMetadata = {
  agent_type: typeof PRE_SCREENING_AGENT_TYPE;
  context: {
    mode: "diagnostic";
    student_name: string;
    comfortable_language: string | null;
    english_level: string | null;
    speaking_speed: number | null;
    is_feedback_enabled: boolean;
    prompt: string;
    student_profile: string | null;
    session_brief: {
      native_language: string | null;
      english_level: string | null;
      speaking_speed: string | null;
    };
  };
};

const PRE_SCREENING_SPEAKING_SPEED_VALUES = {
  normal: 0.9,
  relaxed: 0.7,
  slow: 0.5,
} as const;

export const PRE_SCREENING_SECTION_CARDS: PreScreeningSectionCard[] = [
  {
    id: "job_plans",
    title: "Job Plans",
    description: "What jobs you're aiming for, dream, backup - and why each one",
    icon: "🎯",
    tone: "amber",
  },
  {
    id: "job_research",
    title: "Job Research",
    description: "What you know about those jobs - companies, seniors, skills, pay, tools",
    icon: "🔍",
    tone: "blue",
  },
];

export const PRE_SCREENING_AGENT_QUESTIONS: PreScreeningAgentQuestion[] = [
  {
    identifier: "main_target_role",
    text: "What role are you actively targeting right now?",
    description: "Start with the learner's current realistic role target.",
    hint: "Ask for one role first, then let them expand naturally.",
  },
  {
    identifier: "dream_role",
    text: "What's your dream job if everything goes well?",
    description: "Capture the aspirational role or company the learner wants most.",
    hint: "If they mention a company, ask why that company matters.",
  },
  {
    identifier: "backup_role",
    text: "If the main plan doesn't work out immediately, what's your backup role?",
    description: "Identify the fallback job path they still feel okay taking.",
    hint: "Prompt for confidence or practicality behind the choice.",
  },
  {
    identifier: "job_research_companies",
    text: "Which companies or teams do you know that hire for these roles?",
    description: "Measure how specific their company awareness is.",
    hint: "A few concrete examples are better than broad guesses.",
  },
  {
    identifier: "job_research_skills",
    text: "What skills, tools, or interview topics do you think those roles expect?",
    description: "Probe awareness of skills, stacks, and hiring expectations.",
    hint: "If needed, separate technical skills, tools, and communication skills.",
  },
  {
    identifier: "job_research_market_awareness",
    text: "What do you know about pay, job descriptions, or seniors who got similar roles?",
    description: "Check whether the learner has researched the market beyond the role title.",
    hint: "Look for specific evidence, not just optimism.",
  },
];

function toSentenceCase(value: string) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function joinNonEmpty(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

export function buildPreScreeningParticipantName(name?: string | null) {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "Student";
}

export function buildPreScreeningProfileLine(profile?: PreScreeningProfileSummary | null) {
  if (!profile) {
    return null;
  }

  const summary = joinNonEmpty([
    profile.institution,
    joinNonEmpty([profile.degree, profile.stream]),
    profile.yearOfStudy ? `${profile.yearOfStudy} year` : null,
  ]);

  return summary || null;
}

export function getPreScreeningSpeakingSpeedValue(speakingSpeed?: string | null) {
  if (!speakingSpeed) {
    return null;
  }

  return (
    PRE_SCREENING_SPEAKING_SPEED_VALUES[
      speakingSpeed as keyof typeof PRE_SCREENING_SPEAKING_SPEED_VALUES
    ] ?? null
  );
}

export function buildPreScreeningRoomMetadata(input: {
  studentName?: string | null;
  setup: PreScreeningSetup;
  profile?: PreScreeningProfileSummary | null;
}): PreScreeningRoomMetadata {
  const studentName = buildPreScreeningParticipantName(input.studentName);
  const profileLine = buildPreScreeningProfileLine(input.profile);

  return {
    agent_type: PRE_SCREENING_AGENT_TYPE,
    context: {
      mode: "diagnostic",
      student_name: studentName,
      comfortable_language: input.setup.nativeLanguage ?? null,
      english_level: input.setup.englishLevel ?? null,
      speaking_speed: getPreScreeningSpeakingSpeedValue(input.setup.speakingSpeed),
      is_feedback_enabled: false,
      prompt:
        "Run a short voice pre-screening conversation. Ask one question at a time, keep answers concise, stay encouraging but direct, and focus on job targets plus job research awareness.",
      student_profile: profileLine,
      session_brief: {
        native_language: input.setup.nativeLanguage
          ? toSentenceCase(input.setup.nativeLanguage)
          : null,
        english_level: input.setup.englishLevel ? toSentenceCase(input.setup.englishLevel) : null,
        speaking_speed: input.setup.speakingSpeed
          ? toSentenceCase(input.setup.speakingSpeed)
          : null,
      },
    },
  };
}
