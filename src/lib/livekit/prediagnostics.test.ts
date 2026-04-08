import { afterEach, describe, expect, it, vi } from "vitest";
import { AccessToken, AgentDispatchClient, RoomServiceClient } from "livekit-server-sdk";
import {
  DEFAULT_PREDIAGNOSTICS_INTERACTION_MODE,
  buildPrediagnosticsParticipantIdentity,
  buildPrediagnosticsRoomName,
  createPrediagnosticsConnectionDetails,
} from "#/lib/livekit/prediagnostics";

vi.mock("livekit-server-sdk", () => {
  class MockAccessToken {
    public static created: MockAccessToken[] = [];
    public grants: Record<string, unknown>[] = [];

    constructor(
      public apiKey: string,
      public apiSecret: string,
      public options: Record<string, unknown>,
    ) {
      MockAccessToken.created.push(this);
    }

    addGrant(grant: Record<string, unknown>) {
      this.grants.push(grant);
    }

    async toJwt() {
      return "mock-jwt-token";
    }
  }

  class MockRoomServiceClient {
    public static createRoomMock = vi.fn<(input: Record<string, unknown>) => Promise<void>>();

    constructor(
      public serverUrl: string,
      public apiKey: string,
      public apiSecret: string,
    ) {}

    async createRoom(input: Record<string, unknown>) {
      return MockRoomServiceClient.createRoomMock(input);
    }
  }

  class MockAgentDispatchClient {
    public static createDispatchMock =
      vi.fn<
        (roomName: string, agentName: string, options: Record<string, unknown>) => Promise<void>
      >();

    constructor(
      public serverUrl: string,
      public apiKey: string,
      public apiSecret: string,
    ) {}

    async createDispatch(roomName: string, agentName: string, options: Record<string, unknown>) {
      return MockAgentDispatchClient.createDispatchMock(roomName, agentName, options);
    }
  }

  return {
    AccessToken: MockAccessToken,
    AgentDispatchClient: MockAgentDispatchClient,
    RoomServiceClient: MockRoomServiceClient,
  };
});

describe("prediagnostics LiveKit helpers", () => {
  const originalEnv = {
    apiKey: process.env.LIVEKIT_API_KEY,
    apiSecret: process.env.LIVEKIT_API_SECRET,
    url: process.env.LIVEKIT_URL,
  };

  afterEach(() => {
    process.env.LIVEKIT_API_KEY = originalEnv.apiKey;
    process.env.LIVEKIT_API_SECRET = originalEnv.apiSecret;
    process.env.LIVEKIT_URL = originalEnv.url;
    vi.clearAllMocks();
    (AccessToken as unknown as { created: unknown[] }).created.length = 0;
  });

  function mockedRoomServiceClient() {
    return RoomServiceClient as unknown as typeof RoomServiceClient & {
      createRoomMock: ReturnType<typeof vi.fn>;
    };
  }

  function mockedAgentDispatchClient() {
    return AgentDispatchClient as unknown as typeof AgentDispatchClient & {
      createDispatchMock: ReturnType<typeof vi.fn>;
    };
  }

  function mockedAccessToken() {
    return AccessToken as unknown as typeof AccessToken & {
      created: Array<Record<string, unknown>>;
    };
  }

  it("builds unique participant identities with a stable prefix", () => {
    const identity = buildPrediagnosticsParticipantIdentity("User-123");
    expect(identity).toMatch(/^prediag_user_user123_/);
  });

  it("builds unique room names with a stable prefix", () => {
    const roomName = buildPrediagnosticsRoomName("User-123");
    expect(roomName).toMatch(/^prediag_user123_/);
  });

  it("defaults prediagnostics interaction mode to push to talk", () => {
    expect(DEFAULT_PREDIAGNOSTICS_INTERACTION_MODE).toBe("ptt");
  });

  it("creates a room, dispatches the agent, and returns token details", async () => {
    process.env.LIVEKIT_API_KEY = "test-key";
    process.env.LIVEKIT_API_SECRET = "test-secret";
    process.env.LIVEKIT_URL = "wss://example.livekit.cloud";

    const details = await createPrediagnosticsConnectionDetails({
      sessionId: "diag-session-1",
      roomName: "prediag_room",
      participantIdentity: "prediag_user",
      participantName: "Student One",
      participantMetadata: JSON.stringify({ userId: "user-1" }),
      roomMetadata: JSON.stringify({
        interaction_mode: "ptt",
        prompt_context: { userName: "Student One" },
        config: { voice: "ishita", speakingSpeed: 1 },
      }),
      agentName: "pre-screen-agent",
      agentMetadata: JSON.stringify({
        studentId: "user-1",
        prompt_context: { userName: "Student One" },
        config: { voice: "ishita", speakingSpeed: 1 },
      }),
      interactionMode: "ptt",
      coach: "sana",
    });

    expect(mockedRoomServiceClient().createRoomMock).toHaveBeenCalledWith({
      name: "prediag_room",
      metadata: JSON.stringify({
        interaction_mode: "ptt",
        prompt_context: { userName: "Student One" },
        config: { voice: "ishita", speakingSpeed: 1 },
      }),
      emptyTimeout: 600,
      maxParticipants: 10,
    });
    expect(mockedAgentDispatchClient().createDispatchMock).toHaveBeenCalledWith(
      "prediag_room",
      "pre-screen-agent",
      {
        metadata: JSON.stringify({
          studentId: "user-1",
          prompt_context: { userName: "Student One" },
          config: { voice: "ishita", speakingSpeed: 1 },
        }),
      },
    );

    const tokenInstance = mockedAccessToken().created[0];

    expect(details.sessionId).toBe("diag-session-1");

    expect(tokenInstance.options).toMatchObject({
      identity: "prediag_user",
      name: "Student One",
      ttl: "15m",
      metadata: JSON.stringify({ userId: "user-1" }),
    });
    expect(tokenInstance.grants).toContainEqual({
      room: "prediag_room",
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });
    expect(details).toEqual({
      sessionId: "diag-session-1",
      serverUrl: "wss://example.livekit.cloud",
      roomName: "prediag_room",
      participantName: "Student One",
      participantToken: "mock-jwt-token",
      interactionMode: "ptt",
      coach: "sana",
    });
  });
});
