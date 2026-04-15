// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  useAgentMock,
  usePersistentUserChoicesMock,
  useSessionContextMock,
  usePrediagnosticsMessagesMock,
  usePrediagnosticsPushToTalkMock,
  usePrediagnosticsTranscriptMock,
  fetchMock,
} = vi.hoisted(() => ({
  useAgentMock: vi.fn<() => unknown>(),
  usePersistentUserChoicesMock: vi.fn<() => unknown>(),
  useSessionContextMock: vi.fn<() => unknown>(),
  usePrediagnosticsMessagesMock: vi.fn<() => unknown>(),
  usePrediagnosticsPushToTalkMock: vi.fn<() => unknown>(),
  usePrediagnosticsTranscriptMock: vi.fn<() => unknown>(),
  fetchMock: vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<unknown>>(),
}));

vi.mock("@livekit/components-react", () => ({
  useAgent: useAgentMock,
  usePersistentUserChoices: usePersistentUserChoicesMock,
  useSessionContext: useSessionContextMock,
}));

vi.mock("#/features/prediagnostics/hooks/use-prediagnostics-messages", () => ({
  usePrediagnosticsMessages: usePrediagnosticsMessagesMock,
}));

vi.mock("#/features/prediagnostics/hooks/use-push-to-talk", () => ({
  usePrediagnosticsPushToTalk: usePrediagnosticsPushToTalkMock,
}));

vi.mock("#/features/prediagnostics/hooks/use-prediagnostics-transcript", () => ({
  usePrediagnosticsTranscript: usePrediagnosticsTranscriptMock,
}));

import { usePrediagnosticsSessionAdapter } from "#/features/prediagnostics/hooks/use-prediagnostics-session-adapter";

describe("usePrediagnosticsSessionAdapter", () => {
  const endMock = vi.fn<() => Promise<void>>();
  const startMock = vi.fn<(options: unknown) => Promise<void>>();
  const onFinishedMock = vi.fn<(payload: { sessionId: string }) => void>();
  const transcript = {
    source: "livekit_prediagnostics_client",
    updatedAt: "2026-04-15T12:00:00.000Z",
    messages: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    global.fetch = fetchMock as typeof fetch;

    useSessionContextMock.mockReturnValue({
      end: endMock,
      isConnected: false,
      start: startMock,
    });

    useAgentMock.mockReturnValue({
      state: "connecting",
      canListen: false,
      isFinished: false,
    });

    usePersistentUserChoicesMock.mockReturnValue({
      userChoices: {
        audioDeviceId: "default",
      },
    });

    usePrediagnosticsMessagesMock.mockReturnValue([]);
    usePrediagnosticsPushToTalkMock.mockReturnValue({
      state: "idle",
      error: null,
      isAvailable: false,
      isRecording: false,
      isProcessing: false,
      isAgentSpeaking: false,
      startTurn: vi.fn<() => Promise<void>>(),
      endTurn: vi.fn<() => Promise<void>>(),
    });
    usePrediagnosticsTranscriptMock.mockReturnValue({
      getTranscript: () => transcript,
    });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  });

  test("requestDisconnect finalizes and ends only once", async () => {
    const { result } = renderHook(() =>
      usePrediagnosticsSessionAdapter({
        connectionDetails: {
          sessionId: "session-1",
          serverUrl: "wss://example.livekit.cloud",
          roomName: "room-1",
          participantName: "Student One",
          participantToken: "token",
          interactionMode: "auto",
          coach: "sana",
        },
        session: {
          room: {
            getActiveDevice: vi.fn<() => string>(),
            switchActiveDevice: vi.fn<(kind: MediaDeviceKind, deviceId: string) => Promise<void>>(),
          },
        } as never,
        sessionId: "session-1",
        onFinished: onFinishedMock,
      }),
    );

    await act(async () => {
      await Promise.all([result.current.requestDisconnect(), result.current.requestDisconnect()]);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/prediagnostics/complete", expect.any(Object));
    expect(endMock).toHaveBeenCalledTimes(1);
    expect(onFinishedMock).toHaveBeenCalledTimes(1);
    expect(onFinishedMock).toHaveBeenCalledWith({ sessionId: "session-1" });
  });

  test("auto-finalizes when the agent finishes after the session has started", async () => {
    const room = {
      getActiveDevice: vi.fn<() => string>(),
      switchActiveDevice: vi.fn<(kind: MediaDeviceKind, deviceId: string) => Promise<void>>(),
    };

    useSessionContextMock
      .mockReturnValueOnce({
        end: endMock,
        isConnected: false,
        start: startMock,
      })
      .mockReturnValue({
        end: endMock,
        isConnected: true,
        start: startMock,
      });

    useAgentMock
      .mockReturnValueOnce({
        state: "connecting",
        canListen: false,
        isFinished: false,
      })
      .mockReturnValue({
        state: "disconnected",
        canListen: false,
        isFinished: true,
      });

    const { rerender } = renderHook(() =>
      usePrediagnosticsSessionAdapter({
        connectionDetails: {
          sessionId: "session-2",
          serverUrl: "wss://example.livekit.cloud",
          roomName: "room-2",
          participantName: "Student One",
          participantToken: "token",
          interactionMode: "auto",
          coach: "sana",
        },
        session: { room } as never,
        sessionId: "session-2",
        onFinished: onFinishedMock,
      }),
    );

    rerender();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(endMock).toHaveBeenCalledTimes(1);
    expect(onFinishedMock).toHaveBeenCalledWith({ sessionId: "session-2" });
  });

  test("restores prior user transcript messages into displayMessages for ptt sessions", () => {
    useSessionContextMock.mockReturnValue({
      end: endMock,
      isConnected: true,
      start: startMock,
    });

    usePrediagnosticsMessagesMock.mockReturnValue([
      {
        id: "agent-1",
        role: "agent",
        kind: "transcript",
        text: "Tell me about your goals.",
        timestamp: 2,
      },
      {
        id: "user-live-1",
        role: "user",
        kind: "transcript",
        text: "partial live segment",
        timestamp: 3,
      },
    ]);

    const { result } = renderHook(() =>
      usePrediagnosticsSessionAdapter({
        connectionDetails: {
          sessionId: "session-3",
          serverUrl: "wss://example.livekit.cloud",
          roomName: "room-3",
          participantName: "Student One",
          participantToken: "token",
          interactionMode: "ptt",
          coach: "sana",
        },
        initialMessages: [
          {
            id: "user-restored-1",
            role: "user",
            kind: "transcript",
            text: "I want to prepare for chef interviews.",
            timestamp: 1,
          },
        ],
        session: {
          room: {
            getActiveDevice: vi.fn<() => string>(),
            switchActiveDevice: vi.fn<(kind: MediaDeviceKind, deviceId: string) => Promise<void>>(),
          },
        } as never,
        sessionId: "session-3",
        onFinished: onFinishedMock,
      }),
    );

    expect(result.current.displayMessages).toEqual([
      {
        id: "user-restored-1",
        role: "user",
        kind: "transcript",
        text: "I want to prepare for chef interviews.",
        timestamp: 1,
      },
      {
        id: "agent-1",
        role: "agent",
        kind: "transcript",
        text: "Tell me about your goals.",
        timestamp: 2,
      },
    ]);
  });
});
