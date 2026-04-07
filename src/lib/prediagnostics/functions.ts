import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "#/lib/auth.server";
import {
  getLatestPreDiagnosticSessionStatus as _getLatestPreDiagnosticSessionStatus,
  hasActiveOrCompletedPreDiagnosticSession as _hasActiveOrCompletedPreDiagnosticSession,
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
