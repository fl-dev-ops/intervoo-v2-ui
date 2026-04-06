/** @vitest-environment jsdom */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

function createReadyResponse() {
  return {
    ok: true,
    json: async () => ({
      session: {
        id: "session-123",
        status: "REPORT_READY",
        roomName: "room-123",
        audioUrl: null,
        startedAt: "2026-04-03T00:00:00.000Z",
        endedAt: "2026-04-03T00:05:00.000Z",
      },
      report: {
        id: "report-123",
        status: "READY",
        promptVersion: "abc123",
        fileUri: null,
        reportJson: {
          dream_job: "Product engineer",
          aiming_for: "Frontend developer",
          backup: null,
          salary_expectation: "6 LPA",
          reasoning: "Enjoys building products.",
          companies_mentioned: ["Acme"],
          roles_mentioned: ["Frontend developer"],
          job_awareness_category: "Clear",
        },
        errorMessage: null,
        metadata: null,
      },
    }),
  };
}

const stepState = vi.hoisted(() => ({
  current: "waitingForEvaluation" as
    | "nativeLanguage"
    | "englishLevel"
    | "speakingSpeed"
    | "intro"
    | "session"
    | "waitingForEvaluation"
    | "evaluationReady"
    | "evaluationFailed",
}));

vi.mock("#/pre-screening/flow", async () => {
  const React = await import("react");

  return {
    usePreScreeningFlow() {
      const [step, setStep] = React.useState(stepState.current);
      return {
        canStart: true,
        setup: {
          nativeLanguage: "hindi",
          englishLevel: "intermediate",
          speakingSpeed: "normal",
        },
        step,
        setStep: (next: typeof step) => {
          stepState.current = next;
          setStep(next);
        },
        updateSetup: vi.fn<() => void>(),
      };
    },
  };
});

vi.mock("#/shared/livekit/components/interview-livekit-session", () => ({
  InterviewLiveKitSession: () => null,
}));

import { PreScreeningPage } from "#/pre-screening/pre-screening-page";

describe("pre-screening report ready flow", () => {
  beforeEach(() => {
    stepState.current = "waitingForEvaluation";
    window.localStorage.clear();
    window.history.replaceState(
      {},
      "",
      "/pre-screening?step=waitingForEvaluation&sessionId=session-123",
    );
    vi.restoreAllMocks();
  });

  test("polls for a ready report and shows the diagnostic CTA", async () => {
    const fetchMock = vi
      .fn<() => Promise<ReturnType<typeof createReadyResponse>>>()
      .mockResolvedValue(createReadyResponse());

    vi.stubGlobal("fetch", fetchMock);

    render(<PreScreeningPage />);

    expect(screen.getByText("Building your Diagnostic Interview...")).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText("Your Diagnostic Interview is ready now")).toBeTruthy();
    });

    expect(screen.getByRole("button", { name: "See my diagnostic interview slot" })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith("/api/livekit/pre-screening/session-123", {
      cache: "no-store",
    });
  });

  test("shows the job plans and job research sections after the report is ready", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createReadyResponse()));

    render(<PreScreeningPage />);

    await waitFor(() => {
      expect(screen.getByText("Your Diagnostic Interview is ready now")).toBeTruthy();
    });

    expect(screen.getByText("Job Plans")).toBeTruthy();
    expect(screen.getByText("Job Research")).toBeTruthy();
    expect(screen.getByText("Skills research")).toBeTruthy();
    expect(screen.getByText("Tools & role clarity")).toBeTruthy();
  });
});
