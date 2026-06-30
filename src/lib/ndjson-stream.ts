type NdjsonStreamOptions<T> = {
  signal?: AbortSignal;
  errorEvent: (error: unknown) => T;
};

const NDJSON_HEADERS = {
  "Cache-Control": "no-cache, no-transform",
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

export function createNdjsonStreamResponse<T>(
  events: AsyncIterable<T>,
  options: NdjsonStreamOptions<T>,
): Response {
  const encoder = new TextEncoder();
  const iterator = events[Symbol.asyncIterator]();
  let cancelled = false;
  let finished = false;

  const closeIterator = async () => {
    if (finished) return;
    finished = true;
    await iterator.return?.();
  };

  const handleAbort = () => {
    cancelled = true;
    void closeIterator().catch(() => undefined);
  };

  options.signal?.addEventListener("abort", handleAbort, { once: true });

  const cleanup = () => {
    options.signal?.removeEventListener("abort", handleAbort);
  };

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (cancelled || options.signal?.aborted) {
        await closeIterator();
        cleanup();
        controller.close();
        return;
      }

      try {
        const result = await iterator.next();

        if (cancelled || options.signal?.aborted) {
          await closeIterator();
          cleanup();
          controller.close();
          return;
        }

        if (result.done) {
          finished = true;
          cleanup();
          controller.close();
          return;
        }

        controller.enqueue(encodeNdjsonLine(encoder, result.value));
      } catch (error) {
        cleanup();
        await closeIterator().catch(() => undefined);

        if (cancelled || options.signal?.aborted) {
          controller.close();
          return;
        }

        try {
          controller.enqueue(
            encodeNdjsonLine(encoder, options.errorEvent(error)),
          );
          controller.close();
        } catch (serializationError) {
          controller.error(serializationError);
        }
      }
    },
    async cancel() {
      cancelled = true;
      cleanup();
      await closeIterator();
    },
  });

  return new Response(stream, { headers: NDJSON_HEADERS });
}

export async function* readNdjsonStream<T>(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<T> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pendingText = "";
  let completed = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      pendingText += decoder.decode(value, { stream: !done });

      const lines = pendingText.split(/\r?\n/);
      pendingText = lines.pop() ?? "";

      for (const line of lines) {
        const event = parseNdjsonLine<T>(line);
        if (event !== null) yield event;
      }

      if (done) {
        const finalEvent = parseNdjsonLine<T>(pendingText);
        if (finalEvent !== null) yield finalEvent;
        completed = true;
        return;
      }
    }
  } finally {
    try {
      if (!completed) await reader.cancel();
    } finally {
      reader.releaseLock();
    }
  }
}

function encodeNdjsonLine<T>(encoder: TextEncoder, value: T): Uint8Array {
  const json = JSON.stringify(value);
  if (json === undefined) {
    throw new TypeError("NDJSON events must be JSON-serializable");
  }
  return encoder.encode(`${json}\n`);
}

function parseNdjsonLine<T>(line: string): T | null {
  const value = line.trim();
  return value ? (JSON.parse(value) as T) : null;
}
