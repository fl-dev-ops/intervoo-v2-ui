export type PreScreenReport = {
  dream_job: string | null;
  aiming_for: string | null;
  backup: string | null;
  salary_expectation: string | null;
  reasoning: string | null;
  companies_mentioned: string[];
  roles_mentioned: string[];
  job_awareness_category: "Unclear" | "Clear" | "Strong";
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
