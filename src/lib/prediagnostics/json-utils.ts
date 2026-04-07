export type JsonObject = Record<string, unknown>;

export function asJsonObject(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as JsonObject;
}

export function mergeJsonObject(base: unknown, patch: JsonObject): JsonObject {
  return {
    ...asJsonObject(base),
    ...patch,
  };
}
