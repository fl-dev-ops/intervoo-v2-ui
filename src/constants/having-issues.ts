export type IssueSection = {
  title?: string;
  options: string[];
};

export type HavingIssuesContent = {
  description: string;
  sections: IssueSection[];
  textareaPlaceholder?: string;
  title: string;
};

export type HavingIssuesContentKey =
  | "general"
  | "jd-details"
  | "jd-listing"
  | "job-preferences"
  | "resume-details"
  | "round-details";

export type HavingIssuesContext = HavingIssuesContent & {
  key: HavingIssuesContentKey;
  route: string;
  step: string | null;
};

const INCORRECT_TITLE = "Is something incorrect?";
const INCORRECT_DESCRIPTION =
  "Help us improve your experience by reporting missing information, incorrect results, or anything that isn't working as expected.";
const INTERVIEW_TITLE = "Having trouble with this interview?";
const INTERVIEW_DESCRIPTION =
  "Report technical issues, interview quality concerns, or anything that isn't working as expected. This won't affect your interview score.";
const INTERVIEW_PLACEHOLDER =
  "Ex: The interviewer interrupted my response before I finished speaking.";
const RESUME_SECTIONS = [
  "Basic information",
  "Skills",
  "Educational background",
  "Experiences",
  "Projects",
];

export const HAVING_ISSUES_CONTENT = {
  general: {
    title: INCORRECT_TITLE,
    description: INCORRECT_DESCRIPTION,
    sections: [],
  },
  "job-preferences": {
    title: INCORRECT_TITLE,
    description: INCORRECT_DESCRIPTION,
    sections: [
      {
        options: [
          "My role not in the list",
          "Company not in the list",
          "Unable to add new role",
          "Unable to add new company",
        ],
      },
    ],
  },
  "resume-details": {
    title: INCORRECT_TITLE,
    description: INCORRECT_DESCRIPTION,
    sections: [
      { title: "Missing details", options: RESUME_SECTIONS },
      { title: "Incorrect details", options: RESUME_SECTIONS },
    ],
    textareaPlaceholder:
      "Ex: My experience at xx is missing, or my skills were extracted incorrectly",
  },
  "jd-listing": {
    title: INCORRECT_TITLE,
    description: INCORRECT_DESCRIPTION,
    sections: [
      {
        options: [
          "JD match score doesn't look right",
          "JD listing is irrelevant/outdated",
          "Missing job details",
          "The role I'm interested in is not available",
        ],
      },
    ],
  },
  "jd-details": {
    title: INTERVIEW_TITLE,
    description: INTERVIEW_DESCRIPTION,
    sections: [
      {
        options: [
          "The job posting has expired",
          "The job posting won't open",
          "This isn't relevant to me",
          "The skill list isn't accurate",
          "Couldn't add a skill",
        ],
      },
    ],
    textareaPlaceholder: INTERVIEW_PLACEHOLDER,
  },
  "round-details": {
    title: INTERVIEW_TITLE,
    description: INTERVIEW_DESCRIPTION,
    sections: [
      {
        options: [
          "Start round isn't working",
          "A round stayed locked after I finished the previous one",
          "The rounds don't feel relevant",
          "The retake option isn't available",
          "Hireability score didn't generate after finishing all 4 rounds",
          "Hireability score doesn't match how I think I did",
        ],
      },
    ],
    textareaPlaceholder: INTERVIEW_PLACEHOLDER,
  },
} satisfies Record<HavingIssuesContentKey, HavingIssuesContent>;

export function getHavingIssuesContext(
  pathname: string,
  searchParams: URLSearchParams,
): HavingIssuesContext {
  const step = searchParams.get("step");
  let key: HavingIssuesContentKey = "general";

  if (pathname === "/onboarding" && step === "resume-details") {
    key = "resume-details";
  } else if (pathname === "/jobs") {
    key = step === "job-preferences" ? "job-preferences" : "jd-listing";
  } else if (/^\/jobs\/[^/]+$/.test(pathname)) {
    key = step === "round-list" ? "round-details" : "jd-details";
  }

  return {
    key,
    route: pathname,
    step,
    ...HAVING_ISSUES_CONTENT[key],
  };
}
