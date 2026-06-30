import "server-only";

const AUTOPROCTOR_API_BASE_URL = "https://www.autoproctor.co";

export type AutoProctorAttemptReport = Record<string, unknown>;
export type AutoProctorEvidenceFileResponse = Record<string, unknown>;
export type AutoProctorEvidenceRecords = unknown;

export async function fetchAutoProctorAttemptReport(input: {
  clientId: string;
  hashedTestAttemptId: string;
  testAttemptId: string;
}) {
  const url = new URL(
    `/api/v2/test-attempts/${encodeURIComponent(input.testAttemptId)}/`,
    AUTOPROCTOR_API_BASE_URL,
  );
  setAutoProctorAuthParams(url, input);

  return fetchAutoProctorJson<AutoProctorAttemptReport>(url, {
    errorPrefix: "AutoProctor report request failed",
  });
}

export async function fetchAutoProctorEvidenceRecords(input: {
  clientId: string;
  hashedTestAttemptId: string;
  testAttemptId: string;
}) {
  const url = new URL(
    `/api/v2/test-attempts/${encodeURIComponent(input.testAttemptId)}/evidence-records-file-url/`,
    AUTOPROCTOR_API_BASE_URL,
  );
  setAutoProctorAuthParams(url, input);

  const fileResponse =
    await fetchAutoProctorJson<AutoProctorEvidenceFileResponse>(url, {
      errorPrefix: "AutoProctor evidence file URL request failed",
    });
  const evidenceFileUrl = fileResponse.all_evidence_records_file_url;

  if (typeof evidenceFileUrl !== "string" || !evidenceFileUrl.trim()) {
    throw new Error("AutoProctor returned no evidence records file URL");
  }

  const records = await fetchAutoProctorJson<AutoProctorEvidenceRecords>(
    new URL(evidenceFileUrl),
    { errorPrefix: "AutoProctor evidence records request failed" },
  );

  return { fileResponse, records };
}

function setAutoProctorAuthParams(
  url: URL,
  input: {
    clientId: string;
    hashedTestAttemptId: string;
  },
) {
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("hashed_test_attempt_id", input.hashedTestAttemptId);
}

async function fetchAutoProctorJson<T>(
  url: URL,
  options: { errorPrefix: string },
) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      getAutoProctorErrorMessage(body) ||
        `${options.errorPrefix} with status ${response.status}`,
    );
  }

  if (!body) {
    throw new Error(`${options.errorPrefix}: empty response`);
  }

  return body as T;
}

function getAutoProctorErrorMessage(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const record = body as Record<string, unknown>;
  for (const key of ["detail", "error", "message"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}
