import { describe, expect, test } from "vitest";
import {
  mergePrediagnosticsMessages,
  type PrediagnosticsMessage,
} from "#/features/prediagnostics/hooks/use-prediagnostics-messages";

describe("mergePrediagnosticsMessages", () => {
  test("replaces an existing transcript segment when the same id receives updated text", () => {
    const persisted: PrediagnosticsMessage[] = [
      {
        id: "segment-1",
        role: "agent",
        kind: "transcript",
        text: "Hi",
        timestamp: 1,
      },
    ];

    const merged = mergePrediagnosticsMessages(persisted, [
      {
        id: "segment-1",
        role: "agent",
        kind: "transcript",
        text: "Hi there, welcome to the session",
        timestamp: 2,
      },
    ]);

    expect(merged).toEqual([
      {
        id: "segment-1",
        role: "agent",
        kind: "transcript",
        text: "Hi there, welcome to the session",
        timestamp: 2,
      },
    ]);
  });

  test("keeps prior messages and appends genuinely new ids", () => {
    const persisted: PrediagnosticsMessage[] = [
      {
        id: "segment-1",
        role: "agent",
        kind: "transcript",
        text: "Hello",
        timestamp: 1,
      },
    ];

    const merged = mergePrediagnosticsMessages(persisted, [
      {
        id: "segment-2",
        role: "user",
        kind: "transcript",
        text: "I want to prepare for placements",
        timestamp: 2,
      },
    ]);

    expect(merged).toEqual([
      {
        id: "segment-1",
        role: "agent",
        kind: "transcript",
        text: "Hello",
        timestamp: 1,
      },
      {
        id: "segment-2",
        role: "user",
        kind: "transcript",
        text: "I want to prepare for placements",
        timestamp: 2,
      },
    ]);
  });
});
