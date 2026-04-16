import type { PrediagnosticsConnectionDetails } from "#/lib/livekit/prediagnostics";

const PREDIAGNOSTICS_SESSION_ID_KEY = "prediagnostics.activeSessionId";
const PREDIAGNOSTICS_CONNECTION_KEY = "prediagnostics.connectionDetails";

export function getPrediagnosticsSessionIdFromStorage() {
  const value = window.localStorage.getItem(PREDIAGNOSTICS_SESSION_ID_KEY);
  return value && value.trim().length > 0 ? value : null;
}

export function replacePrediagnosticsSessionIdInStorage(sessionId: string | null) {
  if (sessionId && sessionId.trim().length > 0) {
    window.localStorage.setItem(PREDIAGNOSTICS_SESSION_ID_KEY, sessionId);
    return;
  }

  window.localStorage.removeItem(PREDIAGNOSTICS_SESSION_ID_KEY);
}

export function getPrediagnosticsConnectionDetailsFromStorage(): PrediagnosticsConnectionDetails | null {
  const raw = window.localStorage.getItem(PREDIAGNOSTICS_CONNECTION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PrediagnosticsConnectionDetails;
    if (parsed?.participantToken && parsed?.serverUrl && parsed?.roomName) {
      return parsed;
    }
  } catch {
    // invalid JSON
  }

  return null;
}

export function replacePrediagnosticsConnectionDetailsInStorage(
  details: PrediagnosticsConnectionDetails | null,
) {
  if (details) {
    window.localStorage.setItem(PREDIAGNOSTICS_CONNECTION_KEY, JSON.stringify(details));
    return;
  }

  window.localStorage.removeItem(PREDIAGNOSTICS_CONNECTION_KEY);
}
