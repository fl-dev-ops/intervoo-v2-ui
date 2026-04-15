const PREDIAGNOSTICS_SESSION_ID_KEY = "prediagnostics.activeSessionId";

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
