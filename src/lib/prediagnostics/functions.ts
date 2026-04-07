import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "#/lib/auth.server";
import {
  getLatestDiagnosticSessionStatus as _getLatestDiagnosticSessionStatus,
  hasActiveOrCompletedSession as _hasActiveOrCompletedSession,
} from "#/lib/prediagnostics/report.server";

export const getLatestDiagnosticSessionStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequest().headers;
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw new Error("Unauthorized");
    }

    return _getLatestDiagnosticSessionStatus(session.user.id);
  },
);

export const hasActiveOrCompletedSession = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequest().headers;
  const session = await auth.api.getSession({ headers });

  if (!session) {
    throw new Error("Unauthorized");
  }

  return _hasActiveOrCompletedSession(session.user.id);
});
