import "server-only";

const AUTOPROCTOR_API_BASE_URL = "https://www.autoproctor.co";

export type AutoProctorAttemptReport = Record<string, unknown>;

export async function fetchAutoProctorAttemptReport(input: {
  clientId: string;
  hashedTestAttemptId: string;
}) {
  const url = new URL(
    `/api/v2/test-attempts/${encodeURIComponent(input.hashedTestAttemptId)}/`,
    AUTOPROCTOR_API_BASE_URL,
  );
  url.searchParams.set("clientId", input.clientId);

  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      getAutoProctorErrorMessage(body) ||
        `AutoProctor report request failed with status ${response.status}`,
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("AutoProctor returned an invalid report response");
  }

  return body as AutoProctorAttemptReport;
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
