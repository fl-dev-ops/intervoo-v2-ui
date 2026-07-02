import "server-only";

import { createHmac } from "node:crypto";
import { prisma } from "@/lib/db";
import { DEFAULT_PROCTORING_CONFIG } from "@/lib/proctor/default-config";
import type {
  ProctorMetadata,
  SessionMetadataWithProctoring,
} from "@/lib/proctor/types";

export function isProctoringEnabled() {
  return process.env.PROCTORING_ENABLED === "true";
}

export function getAutoProctorClientId() {
  const clientId = process.env.AUTOPROCTOR_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing AUTOPROCTOR_CLIENT_ID environment variable");
  }
  return clientId;
}

export function hashAutoProctorTestAttemptId(testAttemptId: string) {
  const clientSecret = process.env.AUTOPROCTOR_CLIENT_SECRET;
  if (!clientSecret) {
    throw new Error("Missing AUTOPROCTOR_CLIENT_SECRET environment variable");
  }

  return createHmac("sha256", clientSecret)
    .update(testAttemptId)
    .digest("base64");
}

export function buildInitialProctorMetadata(input: {
  email?: string | null;
  name?: string | null;
}): ProctorMetadata {
  return {
    config: {
      ...DEFAULT_PROCTORING_CONFIG,
      userDetails: {
        email: input.email ?? null,
        name: input.name ?? null,
      },
    },
    status: "idle",
    startedAt: null,
    stoppedAt: null,
    errorCode: null,
    errorDetail: null,
    trustScore: null,
  };
}

export function mergeProctorMetadata(
  metadata: unknown,
  proctoring: Partial<ProctorMetadata>,
): SessionMetadataWithProctoring {
  const current = normalizeSessionMetadata(metadata);
  const existing = current.proctoring ?? buildInitialProctorMetadata({});

  return {
    ...current,
    proctoring: {
      ...existing,
      ...proctoring,
      config: {
        ...existing.config,
        ...(proctoring.config ?? {}),
        trackingOptions: {
          ...existing.config.trackingOptions,
          ...(proctoring.config?.trackingOptions ?? {}),
        },
        userDetails: {
          ...existing.config.userDetails,
          ...(proctoring.config?.userDetails ?? {}),
        },
      },
    },
  };
}

export async function updateSessionProctorMetadata(
  sessionId: string,
  proctoring: Partial<ProctorMetadata>,
) {
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    select: { metadata: true },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  return prisma.interviewSession.update({
    where: { id: sessionId },
    data: {
      metadata: mergeProctorMetadata(session.metadata, proctoring) as object,
    },
  });
}

function normalizeSessionMetadata(
  metadata: unknown,
): SessionMetadataWithProctoring {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  return metadata as SessionMetadataWithProctoring;
}
