export function buildParticipantName(name?: string | null) {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "Student";
}
