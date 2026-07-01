import { NextResponse } from "next/server";

type PostingProvider = "linkedin" | "naukri";
type PostingStatus = "available" | "unavailable" | "unknown";

const PROVIDERS_BY_HOST = new Map<string, PostingProvider>([
  ["in.linkedin.com", "linkedin"],
  ["www.naukri.com", "naukri"],
]);
const UNAVAILABLE_MARKERS: Record<PostingProvider, string[]> = {
  linkedin: ["job is no longer available", "job not found"],
  naukri: [
    "job not exist",
    "job is no longer available",
    "Job you are looking for is expired",
  ],
};
const MAX_REDIRECTS = 3;
const MAX_RESPONSE_BYTES = 512 * 1024;
const REQUEST_TIMEOUT_MS = 5_000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json({ status: "unknown" }, { status: 400 });
  }

  const source = parseSupportedUrl(rawUrl);
  if (!source) {
    return NextResponse.json({ status: "unknown" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const status = await checkPosting(source, controller.signal);
    return NextResponse.json({ status });
  } catch (error) {
    console.error("Error checking posting URL", { error });
    return NextResponse.json({ status: "unknown" });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkPosting(
  initialUrl: URL,
  signal: AbortSignal,
): Promise<PostingStatus> {
  let currentUrl = initialUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    const response = await fetch(currentUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
      redirect: "manual",
      signal,
    });

    if (isRedirect(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirectCount === MAX_REDIRECTS) return "unknown";

      const redirectUrl = parseSupportedUrl(location, currentUrl);
      if (!redirectUrl) return "unknown";
      currentUrl = redirectUrl;
      continue;
    }

    if (response.status === 404 || response.status === 410) {
      return "unavailable";
    }

    if (!response.ok) return "unknown";

    const contentType = response.headers.get("content-type")?.toLowerCase();
    if (!contentType?.includes("text/html")) return "unknown";

    const html = await readBoundedBody(response);
    if (html === null) return "unknown";

    const provider = PROVIDERS_BY_HOST.get(currentUrl.hostname);
    if (!provider) return "unknown";

    const normalizedHtml = html.toLowerCase().replace(/\s+/g, " ");
    return UNAVAILABLE_MARKERS[provider].some((marker) =>
      normalizedHtml.includes(marker),
    )
      ? "unavailable"
      : "available";
  }

  return "unknown";
}

function parseSupportedUrl(rawUrl: string, baseUrl?: URL): URL | null {
  try {
    const url = baseUrl ? new URL(rawUrl, baseUrl) : new URL(rawUrl);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !PROVIDERS_BY_HOST.has(url.hostname)
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function isRedirect(status: number): boolean {
  return [301, 302, 303, 307, 308].includes(status);
}

async function readBoundedBody(response: Response): Promise<string | null> {
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let body = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      bytesRead += value.byteLength;
      if (bytesRead > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        return null;
      }
      body += decoder.decode(value, { stream: true });
    }
    return body + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
