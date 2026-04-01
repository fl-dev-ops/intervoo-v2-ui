import type { PreScreenReport } from "#/diagnostic/pre-screening-types";

const EXPECTED_REPORT_FORMAT = {
  dream_job: "string or null",
  aiming_for: "string or null",
  backup: "string or null",
  salary_expectation: "string or null",
  reasoning: "string or null",
  companies_mentioned: ["string"],
  roles_mentioned: ["string"],
  job_awareness_category: "Unclear | Clear | Strong",
} satisfies Record<string, unknown>;

function buildCoreMetrics(report: PreScreenReport | null) {
  if (!report) {
    return null;
  }

  return {
    dream_job: report.dream_job,
    aiming_for: report.aiming_for,
    backup: report.backup,
    companies_mentioned: report.companies_mentioned,
    roles_mentioned: report.roles_mentioned,
    job_awareness_category: report.job_awareness_category,
  };
}

export function PreScreenReportPanel(props: {
  status: "waiting" | "ready" | "failed";
  report: PreScreenReport | null;
  errorMessage?: string | null;
  canRetry?: boolean;
  isRetrying?: boolean;
  onRetry?: () => void;
  onReset: () => void;
}) {
  const coreMetrics = buildCoreMetrics(props.report);

  return (
    <section className="pre-screen-report-shell">
      <div className="pre-screen-report-header">
        <div>
          <div className="pre-screen-report-eyebrow">Pre-call Evaluation</div>
          <h2>
            {props.status === "waiting"
              ? "Processing the recording"
              : props.status === "failed"
                ? "Evaluation failed"
                : "Evaluation data ready"}
          </h2>
          <p>
            {props.status === "waiting"
              ? "The session ended. Waiting for LiveKit egress and Gemini evaluation to finish."
              : props.status === "failed"
                ? props.errorMessage || "The report could not be generated."
                : "Printing the stored evaluation payload and the expected report JSON shape."}
          </p>
        </div>

        <div className="pre-screen-report-actions">
          {props.status === "failed" && props.canRetry && props.onRetry ? (
            <button
              className="primary-button primary-button--pill"
              disabled={props.isRetrying}
              type="button"
              onClick={props.onRetry}
            >
              {props.isRetrying ? "Retrying..." : "Retry evaluation"}
            </button>
          ) : null}

          <button className="secondary-button" type="button" onClick={props.onReset}>
            Back to pre-screening
          </button>
        </div>
      </div>

      <div className="pre-screen-report-grid">
        <div className="pre-screen-report-card">
          <div className="pre-screen-report-card-title">Core evaluation metrics</div>
          <pre>{JSON.stringify(coreMetrics, null, 2)}</pre>
        </div>

        <div className="pre-screen-report-card">
          <div className="pre-screen-report-card-title">Expected report JSON format</div>
          <pre>{JSON.stringify(EXPECTED_REPORT_FORMAT, null, 2)}</pre>
        </div>
      </div>
    </section>
  );
}
