const SESSION_ID_PARAM = "sessionId";

export function getSessionIdFromUrl(url: URL = new URL(window.location.href)) {
  const value = url.searchParams.get(SESSION_ID_PARAM);
  return value && value.trim().length > 0 ? value : null;
}

export function replaceSessionIdInUrl(sessionId: string | null) {
  const url = new URL(window.location.href);

  if (sessionId && sessionId.trim().length > 0) {
    url.searchParams.set(SESSION_ID_PARAM, sessionId);
  } else {
    url.searchParams.delete(SESSION_ID_PARAM);
  }

  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}
