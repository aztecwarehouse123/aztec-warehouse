import type { Job, ActiveJobSession } from '../types';

export function computeLiveJobsSummary(jobs: Job[], activeJobSessions: ActiveJobSession[]) {
  const databaseLiveJobs = jobs.filter((job) => job.status === 'picking');
  const uiLiveJobs = activeJobSessions.filter((session) => session.isActive);
  return {
    databaseJobs: databaseLiveJobs,
    uiSessions: uiLiveJobs,
    totalCount: databaseLiveJobs.length + uiLiveJobs.length,
  };
}
