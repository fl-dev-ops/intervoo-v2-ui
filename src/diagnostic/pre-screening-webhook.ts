import { GoogleGenAI } from "@google/genai";
import { prisma } from "#/db.server";
import { asJsonObject, mergeJsonObject, toJsonValue } from "#/diagnostic/pre-screening-metadata";
import {
  buildPreScreenPrompt,
  parsePreScreenReportResponse,
} from "#/diagnostic/pre-screening-report";
import { getPreScreenRecordingDownloadUrl } from "#/diagnostic/s3";
import {
  getPreScreenWebhookReceiver,
  shouldAllowUnverifiedLiveKitWebhook,
} from "#/diagnostic/livekit";

const PRE_SCREEN_REPORT_MODEL = "gemini-2.5-flash";

type LiveKitWebhookEvent = {
  event?: string;
  room?: { name?: string | null } | null;
  participant?: { identity?: string | null; name?: string | null } | null;
  egressInfo?: {
    egressId?: string | null;
    roomName?: string | null;
    fileResults?: Array<{ location?: string | null }>;
  } | null;
};

function getEventRoomName(event: LiveKitWebhookEvent) {
  return event.egressInfo?.roomName ?? event.room?.name ?? null;
}

function getAudioUrlFromEvent(event: LiveKitWebhookEvent) {
  return event.egressInfo?.fileResults?.[0]?.location ?? null;
}

function isAgentParticipant(event: LiveKitWebhookEvent) {
  const identity = event.participant?.identity?.toLowerCase() ?? "";
  const name = event.participant?.name?.toLowerCase() ?? "";
  return identity.includes("agent") || name.includes("agent");
}

export function getMimeTypeFromUrl(url: string) {
  const normalized = url.toLowerCase();

  if (normalized.includes(".mp3")) {
    return "audio/mpeg";
  }

  if (normalized.includes(".wav")) {
    return "audio/wav";
  }

  if (normalized.includes(".webm")) {
    return "audio/webm";
  }

  if (normalized.includes(".ogg")) {
    return "audio/ogg";
  }

  return "video/mp4";
}

async function downloadAudioAsBlob(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download audio from egress: ${response.status}`);
  }

  const mimeType = response.headers.get("content-type") || getMimeTypeFromUrl(url);

  return {
    blob: new Blob([await response.arrayBuffer()], {
      type: mimeType,
    }),
    mimeType,
  };
}

async function getPreScreenAudioDownloadUrl(input: { sessionId: string; audioUrl: string }) {
  try {
    return await getPreScreenRecordingDownloadUrl(input.sessionId);
  } catch {
    return input.audioUrl;
  }
}

async function waitForGeminiFileActive(ai: GoogleGenAI, fileName?: string | null) {
  if (!fileName) {
    return;
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const currentFile = await ai.files.get({ name: fileName });
    const state = currentFile.state?.toString();

    if (!state || state === "ACTIVE") {
      return currentFile;
    }

    if (state === "FAILED") {
      throw new Error(
        `Gemini file processing failed for ${currentFile.name ?? "uploaded file"} (${currentFile.mimeType ?? "unknown mime"})`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Timed out waiting for Gemini file processing");
}

async function markSessionCompleted(roomName: string) {
  const session = await prisma.preScreenSession.findUnique({
    where: { roomName },
  });

  if (!session) {
    return;
  }

  if (session.status !== "STARTED" && session.endedAt) {
    return;
  }

  await prisma.preScreenSession.update({
    where: { id: session.id },
    data: {
      status: session.status === "REPORT_READY" ? "REPORT_READY" : "COMPLETED",
      endedAt: session.endedAt ?? new Date(),
    },
  });
}

export async function parseLiveKitWebhookEvent(request: Request): Promise<LiveKitWebhookEvent> {
  const body = await request.text();
  const authHeader = request.headers.get("Authorization");

  if (authHeader) {
    const receiver = getPreScreenWebhookReceiver();
    return (await receiver.receive(body, authHeader)) as LiveKitWebhookEvent;
  }

  if (shouldAllowUnverifiedLiveKitWebhook()) {
    return JSON.parse(body) as LiveKitWebhookEvent;
  }

  throw new Response("Missing webhook authorization header", { status: 401 });
}

async function acquireSessionReportForEvaluation(sessionId: string, options?: { force?: boolean }) {
  const existing = await prisma.preScreenSessionReport.findUnique({
    where: { sessionId },
  });

  if (!existing) {
    const report = await prisma.preScreenSessionReport.create({
      data: {
        sessionId,
        status: "PROCESSING",
        errorMessage: null,
        metadata: toJsonValue({
          evaluationState: "PROCESSING",
        }),
      },
    });

    return {
      report,
      shouldProcess: true,
    };
  }

  if (!options?.force && existing.status !== "PENDING") {
    return {
      report: existing,
      shouldProcess: false,
    };
  }

  const report = await prisma.preScreenSessionReport.update({
    where: { id: existing.id },
    data: {
      status: "PROCESSING",
      errorMessage: null,
      metadata: toJsonValue(
        mergeJsonObject(existing.metadata, {
          evaluationState: "PROCESSING",
          error: null,
        }),
      ),
    },
  });

  return {
    report,
    shouldProcess: true,
  };
}

function buildGeminiMetadata(input: {
  existing: unknown;
  fileUri?: string | null;
  model?: string;
  mimeType?: string;
  uploadState?: string;
  evaluationState?: string;
  promptVersion?: string;
  error?: string | null;
}) {
  return mergeJsonObject(input.existing, {
    fileUri: input.fileUri ?? null,
    mimeType: input.mimeType ?? null,
    model: input.model ?? null,
    uploadState: input.uploadState ?? null,
    evaluationState: input.evaluationState ?? null,
    promptVersion: input.promptVersion ?? null,
    error: input.error ?? null,
  });
}

async function evaluatePreScreenSession(
  roomName: string,
  event: LiveKitWebhookEvent,
  options?: { force?: boolean },
) {
  const session = await prisma.preScreenSession.findUnique({
    where: { roomName },
    include: { report: true },
  });

  if (!session) {
    return;
  }

  const audioUrl = getAudioUrlFromEvent(event);
  const egressId = event.egressInfo?.egressId ?? null;
  const existingSessionMetadata = asJsonObject(session.sessionMetadata);
  const livekitMetadata = asJsonObject(existingSessionMetadata.livekit);

  await prisma.preScreenSession.update({
    where: { id: session.id },
    data: {
      audioUrl,
      egressId,
      endedAt: session.endedAt ?? new Date(),
      status: session.status === "REPORT_READY" ? "REPORT_READY" : "COMPLETED",
      sessionMetadata: toJsonValue({
        ...existingSessionMetadata,
        livekit: {
          ...livekitMetadata,
          egressId,
        },
        egress: event.egressInfo ?? null,
      }),
    },
  });

  if (!audioUrl) {
    return;
  }

  const claimed = await acquireSessionReportForEvaluation(session.id, {
    force: options?.force,
  });

  if (!claimed.shouldProcess) {
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    await prisma.preScreenSessionReport.update({
      where: { id: claimed.report.id },
      data: {
        status: "FAILED",
        errorMessage: "GEMINI_API_KEY is not configured",
        metadata: toJsonValue(
          mergeJsonObject(claimed.report.metadata, {
            evaluationState: "FAILED",
            error: "GEMINI_API_KEY is not configured",
          }),
        ),
      },
    });
    return;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const mimeType = getMimeTypeFromUrl(audioUrl);
  const audioDownloadUrl = await getPreScreenAudioDownloadUrl({
    sessionId: session.id,
    audioUrl,
  });
  const studentProfile = asJsonObject(existingSessionMetadata.profile);
  const { prompt, promptVersion } = await buildPreScreenPrompt({
    name:
      typeof existingSessionMetadata.studentName === "string"
        ? existingSessionMetadata.studentName
        : null,
    college: typeof studentProfile.institution === "string" ? studentProfile.institution : null,
    degree: typeof studentProfile.degree === "string" ? studentProfile.degree : null,
    stream: typeof studentProfile.stream === "string" ? studentProfile.stream : null,
    year: typeof studentProfile.yearOfStudy === "string" ? studentProfile.yearOfStudy : null,
  });

  const downloadedAudio = await downloadAudioAsBlob(audioDownloadUrl);

  try {
    const uploadedFile = await ai.files.upload({
      file: downloadedAudio.blob,
      config: {
        mimeType: downloadedAudio.mimeType || mimeType,
      },
    });

    if (!uploadedFile.uri) {
      throw new Error("Gemini file upload did not return a file URI");
    }
    await waitForGeminiFileActive(ai, uploadedFile.name);

    const result = await ai.models.generateContent({
      model: PRE_SCREEN_REPORT_MODEL,
      config: {
        temperature: 0,
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt,
            },
            {
              fileData: {
                fileUri: uploadedFile.uri,
                mimeType: uploadedFile.mimeType ?? downloadedAudio.mimeType ?? mimeType,
              },
            },
          ],
        },
      ],
    });

    const rawResponse = result.text ?? "";
    const reportJson = parsePreScreenReportResponse(rawResponse);
    const reportMetadata = buildGeminiMetadata({
      existing: claimed.report.metadata,
      fileUri: uploadedFile.uri,
      mimeType: uploadedFile.mimeType ?? downloadedAudio.mimeType ?? mimeType,
      model: PRE_SCREEN_REPORT_MODEL,
      uploadState: "UPLOADED",
      evaluationState: "READY",
      promptVersion,
      error: null,
    });

    await prisma.preScreenSessionReport.update({
      where: { id: claimed.report.id },
      data: {
        status: "READY",
        promptVersion,
        fileUri: uploadedFile.uri,
        reportJson: toJsonValue(reportJson),
        errorMessage: null,
        metadata: toJsonValue({
          ...reportMetadata,
          rawText: rawResponse,
        }),
      },
    });

    await prisma.preScreenSession.update({
      where: { id: session.id },
      data: {
        status: "REPORT_READY",
        transcriptSummary: toJsonValue(reportJson),
        sessionMetadata: toJsonValue({
          ...existingSessionMetadata,
          livekit: {
            ...livekitMetadata,
            egressId,
          },
          egress: event.egressInfo ?? null,
          gemini: reportMetadata,
        }),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to evaluate pre-screen session";
    const failedMetadata = buildGeminiMetadata({
      existing: claimed.report.metadata,
      model: PRE_SCREEN_REPORT_MODEL,
      mimeType: downloadedAudio.mimeType ?? mimeType,
      uploadState: "FAILED",
      evaluationState: "FAILED",
      promptVersion,
      error: message,
    });

    await prisma.preScreenSessionReport.update({
      where: { id: claimed.report.id },
      data: {
        status: "FAILED",
        promptVersion,
        errorMessage: message,
        metadata: toJsonValue(failedMetadata),
      },
    });

    await prisma.preScreenSession.update({
      where: { id: session.id },
      data: {
        status: "COMPLETED",
        sessionMetadata: toJsonValue({
          ...existingSessionMetadata,
          livekit: {
            ...livekitMetadata,
            egressId,
          },
          egress: event.egressInfo ?? null,
          gemini: failedMetadata,
        }),
      },
    });
  }
}

export async function retryPreScreenSessionEvaluation(sessionId: string) {
  const session = await prisma.preScreenSession.findUnique({
    where: { id: sessionId },
  });

  if (!session?.roomName) {
    throw new Error("Pre-screen session not found");
  }

  if (!session.audioUrl) {
    throw new Error("Recording is not ready yet");
  }

  await evaluatePreScreenSession(
    session.roomName,
    {
      event: "egress_ended",
      egressInfo: {
        egressId: session.egressId,
        roomName: session.roomName,
        fileResults: [{ location: session.audioUrl }],
      },
    },
    { force: true },
  );
}

export async function handleLiveKitWebhookEvent(event: LiveKitWebhookEvent) {
  const roomName = getEventRoomName(event);

  if (!roomName) {
    return new Response(JSON.stringify({ success: true, ignored: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (event.event === "egress_ended") {
    await evaluatePreScreenSession(roomName, event);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (event.event === "room_finished") {
    await markSessionCompleted(roomName);
  }

  if (event.event === "participant_left" && isAgentParticipant(event)) {
    await markSessionCompleted(roomName);
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
