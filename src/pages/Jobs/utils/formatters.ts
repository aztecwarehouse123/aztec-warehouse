import type { Timestamp } from 'firebase/firestore';

/** Parse Firestore / ISO date fields on job documents. */
export function parseJobTimestamp(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/** Duration in seconds → human-readable (picking / verifying). */
export function formatElapsedTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${hours}h ${minutes}m ${remainingSeconds}s`;
}

/** HH:mm:ss for stage start / end on job cards. */
export function formatStageClockTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export type JobStageTiming = {
  endAt: Date;
  startedAt: Date;
  durationLabel: string | null;
};

export function getJobStageTiming(
  endAt: Date | null | undefined,
  startedAt: Date | null | undefined,
  durationSeconds: number | null | undefined
): JobStageTiming | null {
  if (!endAt) return null;

  const started =
    startedAt ??
    (durationSeconds != null && durationSeconds > 0
      ? new Date(endAt.getTime() - durationSeconds * 1000)
      : endAt);

  return {
    endAt,
    startedAt: started,
    durationLabel:
      durationSeconds != null && durationSeconds > 0
        ? formatElapsedTime(durationSeconds)
        : null,
  };
}

export function formatStageClockRange(startedAt: Date, endAt: Date): string {
  return `${formatStageClockTime(startedAt)} – ${formatStageClockTime(endAt)}`;
}

/** MM:SS timer for job creation modal. */
export function formatJobTimer(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
