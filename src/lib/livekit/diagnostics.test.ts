import { describe, expect, test } from "vitest";
import {
  buildDiagnosticsParticipantIdentity,
  buildDiagnosticsParticipantName,
  buildDiagnosticsRoomMetadata,
  buildDiagnosticsRoomName,
  DIAGNOSTICS_AGENT_NAME,
} from "#/lib/livekit/diagnostics";
import type { DiagnosticJobOption } from "#/lib/diagnostics/job-options";
import type { PrediagnosticsReportStatusResponse } from "#/lib/prediagnostics/report";

const selectedJob = {
  band: "dream",
  label: "Dream Job",
  title: "Core Engineering at Google",
  salary: "₹20-40 LPA",
  description: "Deep technical diagnostic interview.",
  companies: ["Google", "Microsoft"],
} satisfies DiagnosticJobOption;

const prediagnostics = {
  session: {
    id: "pre-session-1",
    status: "REPORT_READY",
    roomName: "prediag_room",
    startedAt: "2026-04-26T00:00:00.000Z",
    endedAt: "2026-04-26T00:10:00.000Z",
    transcript: {
      source: "livekit_prediagnostics_client",
      updatedAt: "2026-04-26T00:10:00.000Z",
      messages: [
        {
          id: "m1",
          role: "user",
          text: "I want a backend role.",
          timestamp: "2026-04-26T00:01:00.000Z",
        },
      ],
    },
  },
  report: {
    id: "report-1",
    status: "READY",
    promptVersion: "v1",
    fileUri: null,
    reportJson: {
      dream_job: "Core Engineering at Google",
      aiming_for: "Backend Developer",
      backup: "IT Services",
      salary_expectation: "₹10 LPA",
      reasoning: null,
      companies_mentioned: ["Google"],
      roles_mentioned: ["Backend Developer"],
      job_awareness_category: "Clear",
      job_research_category: "Good",
      job_research_breakdown: {
        skills_research: "Good",
        tools_and_role_clarity: "Good",
        salary_clarity: "Rough idea",
        jd_awareness: "Some gaps",
        company_clarity: "Clear",
      },
    },
    errorMessage: null,
    metadata: null,
  },
} satisfies PrediagnosticsReportStatusResponse;

describe("diagnostics LiveKit helpers", () => {
  test("builds normalized room and participant identifiers", () => {
    expect(buildDiagnosticsRoomName("User_123!")).toBe("diag_user123");
    expect(buildDiagnosticsParticipantIdentity("User_123!")).toBe("diag_user_user123");
    expect(buildDiagnosticsParticipantName("  Rohit  ")).toBe("Rohit");
    expect(buildDiagnosticsParticipantName(" ")).toBe("Student");
  });

  test("builds room metadata with selected job and full prediagnostics context", () => {
    const metadata = buildDiagnosticsRoomMetadata({
      sessionId: "diag-session-1",
      userId: "user-1",
      preDiagnosticSessionId: prediagnostics.session.id,
      band: "dream",
      selectedJob,
      studentProfile: {
        preferredName: "Rohit",
        fullName: "Rohit Sharma",
        institution: "IIT BHU",
        degree: "B.Tech",
        stream: "Computer Science",
        yearOfStudy: "Final year",
        placementPreparation: "active",
        academySelection: "none",
        academyName: "",
        nativeLanguage: "Hindi",
        englishLevel: "B1",
        speakingSpeed: 1,
        coach: "sana",
      },
      prediagnostics,
      agentName: "Sara",
      userName: "Rohit",
      voice: "ishita",
      speakingSpeed: 1,
    });

    expect(DIAGNOSTICS_AGENT_NAME).toBe("diagnostic-agent-local");
    expect(metadata.user_id).toBe("user-1");
    expect(metadata.interaction_mode).toBe("auto");
    expect(metadata.prompt_context.selected_band).toBe("dream");
    expect(metadata.prompt_context.selected_job).toEqual(selectedJob);
    expect(metadata.prompt_context.prediagnostics.transcript?.messages).toHaveLength(1);
    expect(metadata.prompt_context.prediagnostics.report?.aiming_for).toBe("Backend Developer");
    expect(metadata.config).toMatchObject({
      voice: "ishita",
      speakingSpeed: 1,
      interviewMode: "diagnostic",
    });
  });
});
