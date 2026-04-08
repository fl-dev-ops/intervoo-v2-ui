import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "#/lib/auth.server";
import {
  getLatestPreDiagnosticSessionStatus as _getLatestPreDiagnosticSessionStatus,
  hasActiveOrCompletedPreDiagnosticSession as _hasActiveOrCompletedPreDiagnosticSession,
  triggerPreDiagnosticSessionEvaluation as _triggerPreDiagnosticSessionEvaluation,
  getPreDiagnosticSessionStatus as _getPreDiagnosticSessionStatus,
} from "#/lib/prediagnostics/report.server";

export const getLatestPreDiagnosticSessionStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequest().headers;
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw new Error("Unauthorized");
    }

    return _getLatestPreDiagnosticSessionStatus(session.user.id);
  },
);

export const hasActiveOrCompletedPreDiagnosticSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequest().headers;
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw new Error("Unauthorized");
    }

    return _hasActiveOrCompletedPreDiagnosticSession(session.user.id);
  },
);

export const generateReport = createServerFn({ method: "POST" }).handler(async () => {
  const headers = getRequest().headers;
  const session = await auth.api.getSession({ headers });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const latest = await _getLatestPreDiagnosticSessionStatus(session.user.id);

  if (!latest) {
    throw new Error("No pre-diagnostic session found");
  }

  if (latest.report?.status !== "READY") {
    await _triggerPreDiagnosticSessionEvaluation(latest.session.id);
  }

  return _getPreDiagnosticSessionStatus({
    sessionId: latest.session.id,
    userId: session.user.id,
  });
});
