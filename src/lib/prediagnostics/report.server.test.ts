import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  diagnosticSessionFindUniqueMock,
  diagnosticSessionUpdateMock,
  diagnosticSessionReportFindUniqueMock,
  diagnosticSessionReportCreateMock,
  diagnosticSessionReportUpdateMock,
  diagnosticSessionReportUpsertMock,
  generateEvaluationObjectMock,
} = vi.hoisted(() => ({
  diagnosticSessionFindUniqueMock: vi.fn<() => Promise<unknown>>(),
  diagnosticSessionUpdateMock: vi.fn<() => Promise<unknown>>(),
  diagnosticSessionReportFindUniqueMock: vi.fn<() => Promise<unknown>>(),
  diagnosticSessionReportCreateMock: vi.fn<() => Promise<unknown>>(),
  diagnosticSessionReportUpdateMock: vi.fn<() => Promise<unknown>>(),
  diagnosticSessionReportUpsertMock: vi.fn<() => Promise<unknown>>(),
  generateEvaluationObjectMock: vi.fn<() => Promise<unknown>>(),
}));

vi.mock("#/db.server", () => ({
  prisma: {
    diagnosticSession: {
      findUnique: diagnosticSessionFindUniqueMock,
      update: diagnosticSessionUpdateMock,
    },
    diagnosticSessionReport: {
      findUnique: diagnosticSessionReportFindUniqueMock,
      create: diagnosticSessionReportCreateMock,
      update: diagnosticSessionReportUpdateMock,
      upsert: diagnosticSessionReportUpsertMock,
    },
  },
}));

vi.mock("#/lib/evaluation/openrouter.server", () => ({
  EVALUATION_MODEL_ID: "google/gemini-2.5-flash",
  generateEvaluationObject: generateEvaluationObjectMock,
}));

vi.mock("../../../rubrics/pre-call.md?raw", () => ({
  default: "Name: {name}\nCollege: {college}\nDegree: {degree}\nStream: {stream}\nYear: {year}",
}));

import {
  finalizeDiagnosticSession,
  getDiagnosticSessionStatus,
  triggerDiagnosticSessionEvaluation,
} from "#/lib/prediagnostics/report.server";

describe("prediagnostics report server flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENROUTER_API_KEY = "test-openrouter-key";
  });

  test("finalizeDiagnosticSession stores transcript and resets report to pending", async () => {
    diagnosticSessionFindUniqueMock.mockResolvedValue({
      id: "diag-session-1",
      userId: "user-1",
      endedAt: null,
    });

    const result = await finalizeDiagnosticSession({
      sessionId: "diag-session-1",
      userId: "user-1",
      transcript: {
        source: "livekit_prediagnostics_client",
        updatedAt: "2026-04-07T12:00:01.000Z",
        messages: [
          {
            id: "m1",
            role: "user",
            text: "I want to become a data scientist",
            timestamp: "2026-04-07T12:00:00.000Z",
          },
        ],
      },
      messages: null,
    });

    expect(diagnosticSessionUpdateMock).toHaveBeenCalledWith({
      where: { id: "diag-session-1" },
      data: expect.objectContaining({
        status: "COMPLETED",
        transcript: expect.objectContaining({
          source: "livekit_prediagnostics_client",
          messages: [
            expect.objectContaining({
              id: "m1",
              role: "user",
              text: "I want to become a data scientist",
            }),
          ],
        }),
      }),
    });
    expect(diagnosticSessionReportUpsertMock).toHaveBeenCalledWith({
      where: { sessionId: "diag-session-1" },
      create: expect.objectContaining({
        sessionId: "diag-session-1",
        status: "PENDING",
      }),
      update: expect.objectContaining({
        status: "PENDING",
      }),
    });
    expect(result).toEqual({
      sessionId: "diag-session-1",
      transcriptMessageCount: 1,
      transcriptMessages: [
        {
          id: "m1",
          role: "user",
          text: "I want to become a data scientist",
          timestamp: "2026-04-07T12:00:00.000Z",
        },
      ],
    });
  });

  test("finalizeDiagnosticSession preserves existing transcript when incoming transcript is empty", async () => {
    diagnosticSessionFindUniqueMock.mockResolvedValue({
      id: "diag-session-1",
      userId: "user-1",
      endedAt: null,
      transcript: {
        source: "livekit_prediagnostics_client",
        updatedAt: "2026-04-07T12:00:01.000Z",
        messages: [
          {
            id: "m-existing",
            role: "user",
            text: "Existing transcript message",
            timestamp: "2026-04-07T12:00:00.000Z",
          },
        ],
      },
    });

    const result = await finalizeDiagnosticSession({
      sessionId: "diag-session-1",
      userId: "user-1",
      transcript: {
        source: "livekit_prediagnostics_client",
        updatedAt: "2026-04-07T12:00:02.000Z",
        messages: [],
      },
      messages: null,
    });

    expect(diagnosticSessionUpdateMock).toHaveBeenCalledWith({
      where: { id: "diag-session-1" },
      data: expect.objectContaining({
        transcript: expect.objectContaining({
          messages: [
            expect.objectContaining({
              id: "m-existing",
              text: "Existing transcript message",
            }),
          ],
        }),
      }),
    });
    expect(result?.transcriptMessageCount).toBe(1);
  });

  test("triggerDiagnosticSessionEvaluation stores the generated structured report object", async () => {
    diagnosticSessionFindUniqueMock.mockResolvedValue({
      id: "diag-session-1",
      userId: "user-1",
      roomName: "prediag_room",
      transcript: {
        source: "livekit_prediagnostics_client",
        updatedAt: "2026-04-07T12:10:00.000Z",
        messages: [
          {
            id: "m1",
            role: "user",
            text: "My dream job is data science manager in a product company.",
            timestamp: "2026-04-07T12:00:00.000Z",
          },
          {
            id: "m2",
            role: "user",
            text: "Right now I am aiming for a junior data scientist role.",
            timestamp: "2026-04-07T12:01:00.000Z",
          },
        ],
      },
      report: {
        id: "report-1",
        sessionId: "diag-session-1",
        status: "PENDING",
        metadata: { evaluationState: "PENDING" },
      },
      user: {
        name: "Asha Sharma",
        profile: {
          preferredName: "Asha",
          institution: "ABC College",
          degree: "B.Tech",
          stream: "CSE",
          yearOfStudy: "3rd year",
        },
      },
    });

    diagnosticSessionReportFindUniqueMock.mockResolvedValue({
      id: "report-1",
      sessionId: "diag-session-1",
      status: "PENDING",
      metadata: { evaluationState: "PENDING" },
    });

    diagnosticSessionReportUpdateMock.mockResolvedValue({
      id: "report-1",
    });

    generateEvaluationObjectMock.mockResolvedValue({
      object: {
        backup: "any sort of role",
        dream_job: "Data Science Manager or Leader in a Product company",
        reasoning: "I like to analyze a lot of data and get insights through statistical analysis.",
        aiming_for: "Junior Data Scientist Role",
        roles_mentioned: [
          "Data Science",
          "Junior Data Scientist",
          "Data Science Manager",
          "Leader",
        ],
        salary_expectation: null,
        companies_mentioned: [],
        job_research_category: "Good",
        job_awareness_category: "Strong",
        job_research_breakdown: {
          jd_awareness: "Some gaps",
          salary_clarity: "Not yet",
          company_clarity: "Rough idea",
          skills_research: "Good",
          tools_and_role_clarity: "Some gaps",
        },
      },
    });

    await triggerDiagnosticSessionEvaluation("diag-session-1");

    expect(generateEvaluationObjectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0,
        schema: expect.any(Object),
        userContent: expect.arrayContaining([
          expect.objectContaining({
            type: "text",
          }),
        ]),
      }),
    );

    expect(diagnosticSessionReportUpdateMock).toHaveBeenLastCalledWith({
      where: { id: "report-1" },
      data: expect.objectContaining({
        status: "READY",
        reportJson: expect.objectContaining({
          backup: "any sort of role",
          dream_job: "Data Science Manager or Leader in a Product company",
          job_awareness_category: "Strong",
        }),
      }),
    });

    expect(diagnosticSessionUpdateMock).toHaveBeenLastCalledWith({
      where: { id: "diag-session-1" },
      data: {
        status: "REPORT_READY",
      },
    });
  });

  test("triggerDiagnosticSessionEvaluation can use transcript messages provided during completion", async () => {
    diagnosticSessionFindUniqueMock.mockResolvedValue({
      id: "diag-session-1",
      userId: "user-1",
      roomName: "prediag_room",
      transcript: null,
      report: {
        id: "report-1",
        sessionId: "diag-session-1",
        status: "PENDING",
        metadata: { evaluationState: "PENDING" },
      },
      user: {
        name: "Asha Sharma",
        profile: {
          preferredName: "Asha",
          institution: "ABC College",
          degree: "B.Tech",
          stream: "CSE",
          yearOfStudy: "3rd year",
        },
      },
    });

    diagnosticSessionReportFindUniqueMock.mockResolvedValue({
      id: "report-1",
      sessionId: "diag-session-1",
      status: "PENDING",
      metadata: { evaluationState: "PENDING" },
    });

    diagnosticSessionReportUpdateMock.mockResolvedValue({
      id: "report-1",
    });

    generateEvaluationObjectMock.mockResolvedValue({
      object: {
        backup: "any sort of role",
        dream_job: "Data Science Manager or Leader in a Product company",
        reasoning: "I like to analyze a lot of data and get insights through statistical analysis.",
        aiming_for: "Junior Data Scientist Role",
        roles_mentioned: ["Data Science"],
        salary_expectation: null,
        companies_mentioned: [],
        job_research_category: "Good",
        job_awareness_category: "Strong",
        job_research_breakdown: {
          jd_awareness: "Some gaps",
          salary_clarity: "Not yet",
          company_clarity: "Rough idea",
          skills_research: "Good",
          tools_and_role_clarity: "Some gaps",
        },
      },
    });

    await triggerDiagnosticSessionEvaluation("diag-session-1", {
      transcriptMessages: [
        {
          id: "m1",
          role: "user",
          text: "I want to become a junior data scientist.",
          timestamp: "2026-04-07T12:00:00.000Z",
        },
      ],
    });

    expect(generateEvaluationObjectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userContent: expect.arrayContaining([
          expect.objectContaining({
            type: "text",
            text: expect.stringContaining("I want to become a junior data scientist."),
          }),
        ]),
      }),
    );
  });

  test("getDiagnosticSessionStatus returns report data for the owning user", async () => {
    diagnosticSessionFindUniqueMock.mockResolvedValue({
      id: "diag-session-1",
      userId: "user-1",
      status: "REPORT_READY",
      roomName: "prediag_room",
      startedAt: new Date("2026-04-07T12:00:00.000Z"),
      endedAt: new Date("2026-04-07T12:10:00.000Z"),
      report: {
        id: "report-1",
        status: "READY",
        promptVersion: "abc123def4567890",
        fileUri: null,
        reportJson: {
          dream_job: "Data Science Manager",
          aiming_for: "Junior Data Scientist",
          backup: "Analyst",
          salary_expectation: null,
          reasoning: "Likes analytics",
          companies_mentioned: [],
          roles_mentioned: ["Junior Data Scientist"],
          job_awareness_category: "Strong",
          job_research_category: "Good",
          job_research_breakdown: {
            skills_research: "Good",
            tools_and_role_clarity: "Some gaps",
            salary_clarity: "Not yet",
            jd_awareness: "Some gaps",
            company_clarity: "Rough idea",
          },
        },
        errorMessage: null,
        metadata: { evaluationState: "READY" },
      },
    });

    const result = await getDiagnosticSessionStatus({
      sessionId: "diag-session-1",
      userId: "user-1",
    });

    expect(result?.session.status).toBe("REPORT_READY");
    expect(result?.report?.status).toBe("READY");
    expect(result?.report?.reportJson?.dream_job).toBe("Data Science Manager");
  });
});
