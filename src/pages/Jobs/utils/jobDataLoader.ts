import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
  where,
  type Query,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import type { FirestoreJob, FirestoreJobItem, Job, JobStatus } from '../types';
import { parseJobTimestamp } from './formatters';
import { enrichJobsWithPackingTimestamps } from './packingTimestamps';
import { filterJobs } from './jobFilters';

export type JobsFetchView = 'active' | 'completed' | 'archived' | 'live';

export function isFirestoreMissingIndexError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String(error.code) : '';
  const message = 'message' in error ? String(error.message) : '';
  return code === 'failed-precondition' && message.toLowerCase().includes('index');
}

export function extractFirestoreIndexUrl(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('message' in error)) return null;
  const match = String(error.message).match(/https:\/\/console\.firebase\.google\.com[^\s)]+/);
  return match ? match[0] : null;
}

export function getTodayStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function mapFirestoreJobDoc(docSnap: QueryDocumentSnapshot): Job {
  const data = docSnap.data() as FirestoreJob;
  return {
    id: docSnap.id,
    jobId: data.jobId || '',
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    createdBy: data.createdBy || 'Unknown',
    status: (data.status as JobStatus) || 'picking',
    picker: data.picker ?? null,
    packer: data.packer ?? null,
    items: Array.isArray(data.items)
      ? data.items.map((it: FirestoreJobItem) => ({
          barcode: String(it.barcode || ''),
          name: it.name ?? null,
          asin: it.asin ?? null,
          quantity: Number(it.quantity || 1),
          verified: Boolean(it.verified),
          locationCode: it.locationCode,
          shelfNumber: it.shelfNumber,
          reason: it.reason || 'Unknown',
          storeName: it.storeName || 'Unknown',
          stockItemId: it.stockItemId,
        }))
      : [],
    pickingTime: data.pickingTime || 0,
    trolleyNumber: data.trolleyNumber ?? null,
    verifyingTimeAccumulated: data.verifyingTimeAccumulated ?? 0,
    verifyingTime: data.verifyingTime ?? null,
    packingStartedAt: parseJobTimestamp(data.packingStartedAt),
    packingCompletedAt: parseJobTimestamp(data.packingCompletedAt),
  };
}

export function buildJobsQuery(
  view: JobsFetchView,
  options?: { startDate?: Date | null; endDate?: Date | null }
): Query {
  const jobsCol = collection(db, 'jobs');

  switch (view) {
    case 'active':
      return query(
        jobsCol,
        where('status', 'in', ['picking', 'awaiting_pack']),
        orderBy('createdAt', 'desc')
      );
    case 'live':
      return query(jobsCol, where('status', '==', 'picking'), orderBy('createdAt', 'desc'));
    case 'completed': {
      const todayStart = Timestamp.fromDate(getTodayStart());
      return query(
        jobsCol,
        where('status', '==', 'completed'),
        where('createdAt', '>=', todayStart),
        orderBy('createdAt', 'desc')
      );
    }
    case 'archived': {
      const start = options?.startDate ?? getTodayStart();
      const end =
        options?.endDate ??
        new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59, 999);
      return query(
        jobsCol,
        where('status', '==', 'completed'),
        where('createdAt', '>=', Timestamp.fromDate(start)),
        where('createdAt', '<=', Timestamp.fromDate(end)),
        orderBy('createdAt', 'desc')
      );
    }
    default:
      return query(jobsCol, orderBy('createdAt', 'desc'));
  }
}

export function buildJobsDateRangeQuery(start: Date, end: Date, status?: JobStatus): Query {
  const jobsCol = collection(db, 'jobs');
  const startTs = Timestamp.fromDate(start);
  const endTs = Timestamp.fromDate(end);

  if (status) {
    return query(
      jobsCol,
      where('status', '==', status),
      where('createdAt', '>=', startTs),
      where('createdAt', '<=', endTs),
      orderBy('createdAt', 'desc')
    );
  }

  return query(
    jobsCol,
    where('createdAt', '>=', startTs),
    where('createdAt', '<=', endTs),
    orderBy('createdAt', 'desc')
  );
}

async function fetchInventoryNamesForBarcodes(
  barcodes: string[]
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  const unique = [...new Set(barcodes.filter(Boolean))];
  if (unique.length === 0) return map;

  for (let i = 0; i < unique.length; i += 10) {
    const chunk = unique.slice(i, i + 10);
    const inventoryQuery = query(collection(db, 'inventory'), where('barcode', 'in', chunk));
    const snapshot = await getDocs(inventoryQuery);
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.barcode) {
        map.set(String(data.barcode), data.name || null);
      }
    });
  }

  return map;
}

export async function enrichJobItemNames(jobs: Job[]): Promise<Job[]> {
  const missingBarcodes: string[] = [];
  for (const job of jobs) {
    for (const item of job.items) {
      if (!item.name && item.barcode) {
        missingBarcodes.push(item.barcode);
      }
    }
  }

  if (missingBarcodes.length === 0) return jobs;

  const barcodeToNameMap = await fetchInventoryNamesForBarcodes(missingBarcodes);

  return jobs.map((job) => ({
    ...job,
    items: job.items.map((item) => ({
      ...item,
      name: item.name || barcodeToNameMap.get(item.barcode) || null,
    })),
  }));
}

async function fetchAllJobsOrdered(): Promise<Job[]> {
  const jobsQuery = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(jobsQuery);
  return snapshot.docs.map(mapFirestoreJobDoc);
}

function filterJobsForView(
  jobs: Job[],
  view: JobsFetchView,
  options?: { startDate?: Date | null; endDate?: Date | null }
): Job[] {
  return filterJobs(jobs, {
    showArchived: view === 'archived',
    showCompleted: view === 'completed',
    showLiveJobs: view === 'live',
    startDate: view === 'archived' ? (options?.startDate ?? null) : null,
    endDate: view === 'archived' ? (options?.endDate ?? null) : null,
    selectedUser: 'all',
    archivedJobsSearchQuery: '',
  });
}

function filterJobsInDateRange(
  jobs: Job[],
  start: Date,
  end: Date,
  status?: JobStatus
): Job[] {
  return jobs.filter((job) => {
    if (status && job.status !== status) return false;
    return job.createdAt >= start && job.createdAt <= end;
  });
}

async function finalizeJobs(
  jobs: Job[],
  options?: { enrichTimestamps?: boolean; enrichItemNames?: boolean }
): Promise<Job[]> {
  let result = jobs;

  if (options?.enrichItemNames !== false) {
    result = await enrichJobItemNames(result);
  }

  if (options?.enrichTimestamps) {
    result = await enrichJobsWithPackingTimestamps(result);
  }

  return result;
}

export async function fetchJobsFromQuery(
  jobsQuery: Query,
  options?: { enrichTimestamps?: boolean; enrichItemNames?: boolean }
): Promise<Job[]> {
  const snapshot = await getDocs(jobsQuery);
  const jobs = snapshot.docs.map(mapFirestoreJobDoc);
  return finalizeJobs(jobs, options);
}

export type FetchJobsResult = {
  jobs: Job[];
  usedIndexFallback: boolean;
  missingIndexUrl: string | null;
};

export async function fetchJobsForView(
  view: JobsFetchView,
  options?: {
    startDate?: Date | null;
    endDate?: Date | null;
    enrichTimestamps?: boolean;
    enrichItemNames?: boolean;
  }
): Promise<FetchJobsResult> {
  const jobsQuery = buildJobsQuery(view, {
    startDate: options?.startDate,
    endDate: options?.endDate,
  });

  try {
    const jobs = await fetchJobsFromQuery(jobsQuery, {
      enrichTimestamps: options?.enrichTimestamps,
      enrichItemNames: options?.enrichItemNames,
    });
    return { jobs, usedIndexFallback: false, missingIndexUrl: null };
  } catch (error) {
    if (!isFirestoreMissingIndexError(error)) throw error;

    console.warn(
      'Firestore composite index not ready — loading all jobs and filtering in the browser.',
      error
    );

    const allJobs = await fetchAllJobsOrdered();
    const filtered = filterJobsForView(allJobs, view, {
      startDate: options?.startDate,
      endDate: options?.endDate,
    });
    const jobs = await finalizeJobs(filtered, {
      enrichTimestamps: options?.enrichTimestamps,
      enrichItemNames: options?.enrichItemNames,
    });

    return {
      jobs,
      usedIndexFallback: true,
      missingIndexUrl: extractFirestoreIndexUrl(error),
    };
  }
}

export async function fetchJobsInDateRange(
  start: Date,
  end: Date,
  options?: { status?: JobStatus; enrichTimestamps?: boolean; enrichItemNames?: boolean }
): Promise<FetchJobsResult> {
  const jobsQuery = buildJobsDateRangeQuery(start, end, options?.status);

  try {
    const jobs = await fetchJobsFromQuery(jobsQuery, {
      enrichTimestamps: options?.enrichTimestamps,
      enrichItemNames: options?.enrichItemNames,
    });
    return { jobs, usedIndexFallback: false, missingIndexUrl: null };
  } catch (error) {
    if (!isFirestoreMissingIndexError(error)) throw error;

    console.warn(
      'Firestore composite index not ready — loading all jobs and filtering in the browser.',
      error
    );

    const allJobs = await fetchAllJobsOrdered();
    const filtered = filterJobsInDateRange(allJobs, start, end, options?.status);
    const jobs = await finalizeJobs(filtered, {
      enrichTimestamps: options?.enrichTimestamps,
      enrichItemNames: options?.enrichItemNames,
    });

    return {
      jobs,
      usedIndexFallback: true,
      missingIndexUrl: extractFirestoreIndexUrl(error),
    };
  }
}
