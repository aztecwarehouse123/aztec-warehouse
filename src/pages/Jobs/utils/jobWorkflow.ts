import type { Job, JobStatus } from '../types';

export type JobWorkflowPhase =
  | 'picking'
  | 'awaiting_verification'
  | 'awaiting_pack'
  | 'packing'
  | 'completed';

export const ACTIVE_JOB_STATUSES: JobStatus[] = [
  'picking',
  'awaiting_verification',
  'awaiting_pack',
  'packing',
];

export function countVerifiedItems(job: Job, locallyVerifiedItems: Set<string>): number {
  return job.items.filter(
    (item) => item.verified || locallyVerifiedItems.has(`${job.id}-${item.barcode}`)
  ).length;
}

export function areAllItemsVerified(job: Job, locallyVerifiedItems: Set<string>): boolean {
  if (job.items.length === 0) return false;
  return countVerifiedItems(job, locallyVerifiedItems) === job.items.length;
}

export function isVerificationCompleteInDb(job: Job): boolean {
  return Boolean(job.verificationCompletedAt) || job.verifyingTime != null;
}

/** Maps stored status to workflow phase. Verify items during packing (after Start Packing). */
export function getJobWorkflowPhase(job: Job): JobWorkflowPhase {
  if (job.status === 'completed') return 'completed';
  if (job.status === 'packing') return 'packing';
  if (job.status === 'picking') return 'picking';

  if (job.status === 'awaiting_pack' || job.status === 'awaiting_verification') {
    return 'awaiting_pack';
  }

  return 'picking';
}

export function isPackVerifySessionActive(job: Job): boolean {
  return job.status === 'packing';
}

export function getJobStatusLabel(phase: JobWorkflowPhase): string {
  switch (phase) {
    case 'picking':
      return 'Picking';
    case 'awaiting_verification':
      return 'Awaiting Verification';
    case 'awaiting_pack':
      return 'Awaiting Pack';
    case 'packing':
      return 'Packing';
    case 'completed':
      return 'Completed';
  }
}
