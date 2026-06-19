import {
  type GenerateContentResponseUsageMetadata,
  GoogleGenAI,
} from "@google/genai";
import { FatalError, getStepMetadata, RetryableError } from "workflow";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  deleteGeminiFiles,
  FileState,
  getGeminiApiKey,
  getRecordingMimeType,
  type UploadedGeminiFile,
  uploadedGeminiFileStatus,
  uploadGeminiFile,
} from "@/lib/gemini-client";
import { getPostHogClient } from "@/lib/posthog-server";
import {
  buildDiagnosticReportResult,
  prepareDiagnosticReportGeneration,
} from "@/lib/report-generation/diagnostic";
import { buildReportAiGenerationProps } from "@/lib/report-generation/token-usage";
import { createUniquePublicReportToken } from "@/lib/report-share";
import {
  buildDiagnosticSheetRows,
  postRowsToReportSheet,
} from "@/lib/report-sheet-sync";
import { buildPublicReportUrl } from "@/lib/share-token";
import { sendWhatsAppReportLink } from "@/lib/twilio";

type DiagnosticReportGenerationResult = ReturnType<
  typeof buildDiagnosticReportResult
> & {
  usage: GenerateContentResponseUsageMetadata | undefined;
  modelId: string;
};
type ReadyGeminiFile = UploadedGeminiFile & { uri: string };

type WorkflowResult = {
  sessionId: string;
  shareToken: string;
  status: "READY";
};

const TRANSIENT_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const FILE_ACTIVE_POLL_INTERVAL_MS = 1500;
const FILE_ACTIVE_POLL_TIMEOUT_MS = 120_000;

export async function generateDiagnosticSessionReportWorkflow(
  sessionId: string,
  baseUrl: string,
): Promise<WorkflowResult> {
  "use workflow";

  let uploadedFiles: ReadyGeminiFile[] = [];

  try {
    await prepareDiagnosticReportStep(sessionId);
    uploadedFiles = await prepareDiagnosticGeminiFilesStep(sessionId);
    const generated = await generateDiagnosticReportStep(
      sessionId,
      uploadedFiles,
    );
    const persisted = await persistDiagnosticReportStep(sessionId, generated);
    await captureDiagnosticReportUsageStep(
      sessionId,
      generated.usage,
      generated.modelId,
    );
    await syncDiagnosticReportToSheetStep(sessionId, baseUrl);
    await sendDiagnosticReportLinkStep(
      sessionId,
      baseUrl,
      persisted.shareToken,
    );
    await cleanupDiagnosticGeminiFilesStep(uploadedFiles);
    return persisted;
  } catch (error) {
    await cleanupDiagnosticGeminiFilesStep(uploadedFiles);
    await markDiagnosticReportFailedStep(sessionId, getErrorMessage(error));
    throw error;
  }
}

async function prepareDiagnosticReportStep(sessionId: string) {
  "use step";

  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: { report: true },
  });

  if (!session) {
    throw new FatalError("Session not found");
  }

  if (session.type !== "DIAGNOSTIC_ROUND") {
    throw new FatalError(`Unsupported session type: ${session.type}`);
  }

  await prisma.report.upsert({
    where: { sessionId: session.id },
    create: {
      sessionId: session.id,
      status: "PROCESSING",
      startedAt: new Date(),
    },
    update: {
      status: "PROCESSING",
      errorMessage: null,
      startedAt: new Date(),
      completedAt: null,
      failedAt: null,
    },
  });

  console.info("[diagnostics] diagnostic report workflow prepared", {
    sessionId,
  });
}

async function prepareDiagnosticGeminiFilesStep(
  sessionId: string,
): Promise<ReadyGeminiFile[]> {
  "use step";

  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    select: { audioUrl: true, transcriptUrl: true },
  });

  if (!session) {
    throw new FatalError("Session not found");
  }
  if (!session.audioUrl) {
    throw new FatalError("No audio recording is available for this session");
  }
  if (!session.transcriptUrl) {
    throw new FatalError("No transcript URL is available for this session");
  }

  const uploadedFiles: UploadedGeminiFile[] = [];

  try {
    uploadedFiles.push(
      await uploadGeminiFile({
        file: {
          kind: "url",
          presignedUrl: session.audioUrl,
          mimeType: getRecordingMimeType(session.audioUrl),
          displayName: `diagnostic-${sessionId}`,
        },
        requestId: `diagnostic-${sessionId}`,
      }),
    );
  } catch (error) {
    await deleteGeminiFiles(uploadedFiles);
    throw error;
  }

  const readyFiles = await waitForGeminiFiles({
    files: uploadedFiles,
    requestId: `diagnostic-${sessionId}`,
  });

  console.info("[diagnostics] diagnostic Gemini files ready", {
    fileCount: readyFiles.length,
    sessionId,
  });

  return readyFiles;
}

async function generateDiagnosticReportStep(
  sessionId: string,
  uploadedFiles: ReadyGeminiFile[],
): Promise<DiagnosticReportGenerationResult> {
  "use step";

  try {
    const generation = await prepareDiagnosticReportGeneration(sessionId);
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });

    console.info("[diagnostics] generating diagnostic report", {
      fileCount: uploadedFiles.length,
      modelId: generation.modelId,
      sessionId,
    });

    const result = await ai.models.generateContent({
      model: generation.modelId,
      contents: [
        {
          role: "user",
          parts: [
            { text: generation.prompt },
            ...uploadedFiles.map((file) => ({
              fileData: {
                fileUri: file.uri,
                mimeType: file.mimeType,
              },
            })),
          ],
        },
      ],
      config: {
        temperature: 0,
        responseMimeType: "application/json",
        responseJsonSchema: sanitizeJsonSchema(
          z.toJSONSchema(generation.schema),
        ),
      },
    });

    if (!result.text) {
      throw new Error("Gemini returned an empty response");
    }

    return {
      ...buildDiagnosticReportResult(
        generation.schema.parse(JSON.parse(result.text)),
      ),
      usage: result.usageMetadata,
      modelId: generation.modelId,
    };
  } catch (error) {
    const status = getErrorStatus(error);
    const message = getErrorMessage(error);

    if (status && TRANSIENT_STATUSES.has(status)) {
      const metadata = getStepMetadata();
      console.warn("[diagnostics] retrying diagnostic report generation", {
        attempt: metadata.attempt,
        error: message,
        sessionId,
        status,
      });
      throw new RetryableError(message, {
        retryAfter: Math.min(metadata.attempt ** 2 * 5_000, 60_000),
      });
    }

    if (isFatalDiagnosticReportError(message)) {
      throw new FatalError(message);
    }

    throw error;
  }
}

generateDiagnosticReportStep.maxRetries = 3;

async function cleanupDiagnosticGeminiFilesStep(files: UploadedGeminiFile[]) {
  "use step";

  if (!files.length) {
    return;
  }

  await deleteGeminiFiles(files);
}

async function waitForGeminiFiles(input: {
  files: UploadedGeminiFile[];
  requestId: string;
}): Promise<ReadyGeminiFile[]> {
  const readyFiles: ReadyGeminiFile[] = [];

  for (const file of input.files) {
    const deadline = Date.now() + FILE_ACTIVE_POLL_TIMEOUT_MS;
    let status = await uploadedGeminiFileStatus(file);

    while (status.state === FileState.PROCESSING) {
      if (Date.now() > deadline) {
        throw new Error("Gemini file did not become ACTIVE before timeout");
      }

      await new Promise((resolve) =>
        setTimeout(resolve, FILE_ACTIVE_POLL_INTERVAL_MS),
      );
      status = await uploadedGeminiFileStatus(status);
    }

    if (status.state === FileState.FAILED) {
      throw new Error(
        `Gemini file processing failed: ${status.errorMessage ?? "unknown error"}`,
      );
    }
    if (!status.uri) {
      throw new Error("Gemini upload returned no file URI");
    }

    console.info("[diagnostics] Gemini file active", {
      fileName: status.name,
      mimeType: status.mimeType,
      requestId: input.requestId,
    });

    readyFiles.push({
      name: status.name,
      uri: status.uri,
      mimeType: status.mimeType,
    });
  }

  return readyFiles;
}

function sanitizeJsonSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map((item) => sanitizeJsonSchema(item));
  }
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(
    schema as Record<string, unknown>,
  )) {
    if (key === "$schema") continue;
    out[key] = sanitizeJsonSchema(value);
  }
  return out;
}

async function persistDiagnosticReportStep(
  sessionId: string,
  result: DiagnosticReportGenerationResult,
): Promise<WorkflowResult> {
  "use step";

  const existingReport = await prisma.report.findUnique({
    where: { sessionId },
    select: { shareToken: true },
  });

  const shareToken =
    existingReport?.shareToken ?? (await createUniquePublicReportToken());

  await prisma.report.upsert({
    where: { sessionId },
    create: {
      sessionId,
      reportJson: result.baseReport as object,
      metadata: result.metadata as object,
      status: "READY",
      completedAt: new Date(),
      shareToken,
    },
    update: {
      reportJson: result.baseReport as object,
      metadata: result.metadata as object,
      status: "READY",
      completedAt: new Date(),
      failedAt: null,
      errorMessage: null,
      shareToken,
    },
  });

  await prisma.interviewSession.update({
    where: { id: sessionId },
    data: { status: "COMPLETED" },
  });

  await prisma.diagnosticRound.updateMany({
    where: { sessionId },
    data: { status: "COMPLETED" },
  });

  console.info("[diagnostics] diagnostic report workflow ready", {
    sessionId,
    shareToken,
  });

  return { sessionId, shareToken, status: "READY" };
}

async function captureDiagnosticReportUsageStep(
  sessionId: string,
  usage: GenerateContentResponseUsageMetadata | undefined,
  modelId: string,
) {
  "use step";

  // Non-fatal: monitoring must never fail or retry report delivery, and
  // swallowing keeps a transient error from re-emitting the event.
  try {
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    const properties = buildReportAiGenerationProps({
      usage,
      modelId,
      traceId: sessionId,
    });

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: session?.userId ?? sessionId,
      event: "$ai_generation",
      properties,
    });
    await posthog.flush();

    console.info("[diagnostics] diagnostic report usage captured", {
      sessionId,
      totalTokens: properties.ai_total_tokens,
      totalCostUsd: properties.$ai_total_cost_usd,
    });
  } catch (error) {
    console.error("[diagnostics] non-fatal report usage capture failure", {
      error: error instanceof Error ? error.message : String(error),
      sessionId,
    });
  }
}

async function syncDiagnosticReportToSheetStep(
  sessionId: string,
  baseUrl: string,
) {
  "use step";

  try {
    const report = await prisma.report.findUnique({
      where: { sessionId },
      include: {
        session: {
          include: {
            user: { select: { name: true } },
            diagnosticRound: {
              include: {
                diagnostic: { select: { selectedBand: true } },
              },
            },
          },
        },
      },
    });

    if (!report?.reportJson) {
      console.warn("[report-sync] report missing or empty; skipping", {
        sessionId,
      });
      return;
    }

    const session = report.session;
    const round = session.diagnosticRound;
    const scoring = (
      report.metadata as { scoring?: { salary_band?: string } } | null
    )?.scoring;
    const reportUrl = report.shareToken
      ? buildPublicReportUrl(baseUrl, report.shareToken, "diag")
      : null;

    const rows = buildDiagnosticSheetRows({
      studentName: session.user.name,
      sessionId: report.sessionId,
      band: round?.diagnostic?.selectedBand ?? null,
      addedAt: (report.completedAt ?? report.createdAt).toISOString(),
      salaryRange: scoring?.salary_band ?? null,
      audioUrl: session.audioUrl,
      videoUrl: session.videoUrl,
      round: round?.roundNumber ?? null,
      reportUrl,
      reportJson: report.reportJson,
    });

    await postRowsToReportSheet(rows);

    console.info("[report-sync] synced diagnostic report to sheet", {
      rowCount: rows.length,
      sessionId,
    });
  } catch (error) {
    console.error("[report-sync] non-fatal sheet sync failure", {
      error: error instanceof Error ? error.message : String(error),
      sessionId,
    });
  }
}

async function sendDiagnosticReportLinkStep(
  sessionId: string,
  baseUrl: string,
  shareToken: string | null,
) {
  "use step";

  if (!shareToken) {
    return;
  }

  try {
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });
    if (!session) {
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, phoneNumber: true },
    });

    if (!user?.phoneNumber) {
      return;
    }

    await sendWhatsAppReportLink(
      user.phoneNumber,
      user.name || "Learner",
      buildPublicReportUrl(baseUrl, shareToken, "diag"),
    );
  } catch (error) {
    console.error("Failed to send WhatsApp diagnostic report link:", error);
  }
}

async function markDiagnosticReportFailedStep(
  sessionId: string,
  errorMessage: string,
) {
  "use step";

  await prisma.report.updateMany({
    where: { sessionId, status: { not: "READY" } },
    data: {
      status: "FAILED",
      errorMessage,
      failedAt: new Date(),
    },
  });

  console.info("[diagnostics] diagnostic report workflow failed", {
    error: errorMessage,
    sessionId,
  });
}

function getErrorStatus(error: unknown): number | null {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") {
      return status;
    }
  }

  const message = getErrorMessage(error);
  try {
    const parsed = JSON.parse(message) as {
      error?: { code?: unknown; status?: unknown };
    };
    const code = parsed.error?.code;
    return typeof code === "number" ? code : null;
  } catch {
    return null;
  }
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "cause" in error) {
    const cause = (error as { cause?: unknown }).cause;
    if (cause instanceof Error) {
      return cause.message;
    }
    if (cause && typeof cause === "object" && "message" in cause) {
      const message = (cause as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) {
        return message;
      }
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (typeof error === "string") {
    return error;
  }
  return "Diagnostic report generation failed";
}

function isFatalDiagnosticReportError(message: string) {
  return [
    "Session not found",
    "Session type is not DIAGNOSTIC_ROUND",
    "No audio recording is available for this session",
    "No transcript URL is available for this session",
    "No transcript is available for this session",
    "No transcript messages found",
    "Diagnostic report is unavailable because no relevant answers were provided",
    "No asked diagnostic questions captured for this session",
  ].some((fatalMessage) => message.includes(fatalMessage));
}
