export type PreScreenResearchCategory = "Not Enough" | "Good" | "Strong";

export type PreScreenTranscriptRole = "agent" | "user";

export type PreScreenTranscriptMessage = {
  id: string;
  participantIdentity: string;
  role: PreScreenTranscriptRole;
  text: string;
  timestamp: string;
};

export type PreScreenSessionTranscript = {
  source: string;
  updatedAt: string;
  messages: PreScreenTranscriptMessage[];
};

export type PreScreenResearchSignal = "Good" | "Some gaps" | "Rough idea" | "Not yet" | "Clear";

export type PreScreenResearchBreakdown = {
  skills_research: PreScreenResearchSignal;
  tools_and_role_clarity: PreScreenResearchSignal;
  salary_clarity: PreScreenResearchSignal;
  jd_awareness: PreScreenResearchSignal;
  company_clarity: PreScreenResearchSignal;
};

export type PreScreenReport = {
  dream_job: string | null;
  aiming_for: string | null;
  backup: string | null;
  salary_expectation: string | null;
  reasoning: string | null;
  companies_mentioned: string[];
  roles_mentioned: string[];
  job_awareness_category: "Unclear" | "Clear" | "Strong";
  job_research_category?: PreScreenResearchCategory | null;
  job_research_breakdown?: PreScreenResearchBreakdown | null;
};

export type PreScreeningSessionStatusResponse = {
  session: {
    id: string;
    status: string;
    roomName: string | null;
    audioUrl: string | null;
    startedAt: string;
    endedAt: string | null;
  };
  report: null | {
    id: string;
    status: string;
    promptVersion: string | null;
    fileUri: string | null;
    reportJson: PreScreenReport | null;
    errorMessage: string | null;
    metadata: unknown;
  };
};
