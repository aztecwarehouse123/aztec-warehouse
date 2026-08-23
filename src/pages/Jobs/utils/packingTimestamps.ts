import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import type { Job } from '../types';
import { parseJobTimestamp } from './formatters';

const COMPLETED_PACKING_RE = /completed packing for job (\S+)/i;
const STARTED_PACKING_RE = /started packing for job (\S+)/i;

/** Fill missing packer timestamps from activity logs (older completed jobs). */
export async function enrichJobsWithPackingTimestamps(jobs: Job[]): Promise<Job[]> {
  const needsEnrichment = jobs.some(
    job => job.status === 'completed' && (!job.packingCompletedAt || !job.packingStartedAt)
  );
  if (!needsEnrichment) return jobs;

  const completedAtByJobId = new Map<string, Date>();
  const startedAtByJobId = new Map<string, Date>();

  try {
    const logsQuery = query(
      collection(db, 'activityLogs'),
      orderBy('time', 'desc'),
      limit(2000)
    );
    const snapshot = await getDocs(logsQuery);

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const detail = String(data.detail || '');
      const time = parseJobTimestamp(data.time);
      if (!time) return;

      const completedMatch = detail.match(COMPLETED_PACKING_RE);
      if (completedMatch && !completedAtByJobId.has(completedMatch[1])) {
        completedAtByJobId.set(completedMatch[1], time);
      }

      const startedMatch = detail.match(STARTED_PACKING_RE);
      if (startedMatch && !startedAtByJobId.has(startedMatch[1])) {
        startedAtByJobId.set(startedMatch[1], time);
      }
    });
  } catch (error) {
    console.error('Failed to enrich jobs with packing timestamps:', error);
    return jobs;
  }

  return jobs.map(job => {
    if (job.status !== 'completed') return job;

    const packingCompletedAt =
      job.packingCompletedAt ?? completedAtByJobId.get(job.jobId) ?? null;

    let packingStartedAt =
      job.packingStartedAt ?? startedAtByJobId.get(job.jobId) ?? null;

    if (!packingStartedAt && packingCompletedAt && job.verifyingTime && job.verifyingTime > 0) {
      packingStartedAt = new Date(packingCompletedAt.getTime() - job.verifyingTime * 1000);
    }

    if (
      packingCompletedAt === job.packingCompletedAt &&
      packingStartedAt === job.packingStartedAt
    ) {
      return job;
    }

    return { ...job, packingCompletedAt, packingStartedAt };
  });
}
