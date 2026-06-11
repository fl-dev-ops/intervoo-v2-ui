export function getSelectedJobId(selectedJob: unknown) {
  if (!selectedJob || typeof selectedJob !== "object" || Array.isArray(selectedJob)) {
    return null;
  }

  const jobId = (selectedJob as { jobId?: unknown }).jobId;
  return typeof jobId === "string" && jobId ? jobId : null;
}
