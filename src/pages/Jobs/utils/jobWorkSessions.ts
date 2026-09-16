export type JobWorkSession = {
  segmentStartMs: number;
  elapsedSeconds: number;
};

export function getActiveSegmentSeconds(session: JobWorkSession | undefined): number {
  if (!session) return 0;
  return Math.floor((Date.now() - session.segmentStartMs) / 1000);
}

export function hasAnyWorkSession(
  verificationSessions: Record<string, JobWorkSession>,
  packingSessions: Record<string, JobWorkSession>
): boolean {
  return Object.keys(verificationSessions).length > 0 || Object.keys(packingSessions).length > 0;
}

export function removeJobSession(
  sessions: Record<string, JobWorkSession>,
  jobId: string
): Record<string, JobWorkSession> {
  if (!sessions[jobId]) return sessions;
  const next = { ...sessions };
  delete next[jobId];
  return next;
}
