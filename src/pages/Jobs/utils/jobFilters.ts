import type { Job } from '../types';

export function isJobArchived(job: Job): boolean {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return job.createdAt < todayStart && job.status === 'completed';
}

export function isJobInDateRange(
  job: Job,
  startDate: Date | null,
  endDate: Date | null
): boolean {
  if (!startDate && !endDate) return true;
  const jobDate = job.createdAt;
  if (startDate && endDate) {
    return jobDate >= startDate && jobDate <= endDate;
  }
  if (startDate) {
    return jobDate >= startDate;
  }
  if (endDate) {
    return jobDate <= endDate;
  }
  return true;
}

export function isJobMatchingUser(job: Job, selectedUser: string): boolean {
  if (selectedUser === 'all') return true;
  return job.createdBy === selectedUser;
}

export function isJobMatchingSearch(job: Job, archivedJobsSearchQuery: string): boolean {
  if (!archivedJobsSearchQuery.trim()) return true;
  const searchTerm = archivedJobsSearchQuery.toLowerCase().trim();
  if (job.jobId.toLowerCase().includes(searchTerm)) {
    return true;
  }
  return job.items.some(
    (item) => item.name && item.name.toLowerCase().includes(searchTerm)
  );
}

export type FilterJobsOptions = {
  showArchived: boolean;
  showCompleted: boolean;
  showLiveJobs: boolean;
  startDate: Date | null;
  endDate: Date | null;
  selectedUser: string;
  archivedJobsSearchQuery: string;
};

export function filterJobs(jobs: Job[], opts: FilterJobsOptions): Job[] {
  return jobs.filter((job) => {
    if (opts.showArchived) {
      return (
        isJobArchived(job) &&
        isJobInDateRange(job, opts.startDate, opts.endDate) &&
        isJobMatchingUser(job, opts.selectedUser) &&
        isJobMatchingSearch(job, opts.archivedJobsSearchQuery)
      );
    }
    if (opts.showCompleted) {
      return job.status === 'completed' && !isJobArchived(job);
    }
    if (opts.showLiveJobs) {
      return job.status === 'picking';
    }
    return job.status !== 'completed';
  });
}

export function getUniqueJobCreators(jobs: Job[]): string[] {
  const users = new Set(jobs.map((job) => job.createdBy));
  return Array.from(users).sort();
}
