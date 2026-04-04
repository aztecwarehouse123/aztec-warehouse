import type { JobItem, StockItem } from '../../types';
import type { Timestamp } from 'firebase/firestore';

export type JobStatus = 'picking' | 'awaiting_pack' | 'completed';

export type Job = {
  id: string;
  jobId: string;
  createdAt: Date;
  createdBy: string;
  status: JobStatus;
  picker?: string | null;
  packer?: string | null;
  items: JobItem[];
  pickingTime?: number;
  trolleyNumber?: number | null;
  verifyingTimeAccumulated?: number;
  verifyingTime?: number | null;
};

export type FirestoreJobItem = {
  barcode?: string;
  name?: string | null;
  asin?: string | null;
  quantity?: number;
  verified?: boolean;
  locationCode?: string;
  shelfNumber?: string;
  reason?: string;
  storeName?: string;
  stockItemId?: string;
};

export type FirestoreJob = {
  jobId?: string;
  createdAt?: Timestamp | Date | string;
  createdBy?: string;
  status?: JobStatus;
  picker?: string | null;
  packer?: string | null;
  items?: FirestoreJobItem[];
  pickingTime?: number;
  trolleyNumber?: number | null;
  verifyingTimeAccumulated?: number;
  verifyingTime?: number | null;
};

export type ActiveJobSession = {
  id: string;
  createdBy: string;
  startTime: Date;
  items: JobItem[];
  isActive: boolean;
};

export type ReportUserStat = {
  name: string;
  jobsCreated: number;
  jobsCompleted: number;
  itemsPicked: number;
  avgTimePerJob: number;
  totalTime: number;
};

export type ReportVerifierStat = {
  name: string;
  jobsVerified: number;
  itemsVerified: number;
  avgVerifyingTime: number;
  totalVerifyingTime: number;
};

export type ReportDataState = {
  dailyStats: Array<{ date: string; itemsPicked: number; jobsCompleted: number }>;
  userStats: ReportUserStat[];
  verifierStats: ReportVerifierStat[];
};

export type ProductivityWorkerStat = {
  name: string;
  totalJobs: number;
  completedJobs: number;
  avgPickingTime: number;
  totalPickingTime: number;
  itemsPicked: number;
  efficiency: number;
  performance: 'excellent' | 'good' | 'average' | 'needs_improvement';
};

export type ProductivityHourlyStat = {
  hour: string;
  totalJobs: number;
  avgPickingTime: number;
  totalItems: number;
};

export type ProductivityDataState = {
  workerStats: ProductivityWorkerStat[];
  hourlyProductivity: ProductivityHourlyStat[];
};

export type PendingStockUpdate = {
  stockItem: StockItem;
  deductedQuantity: number;
  reason: string;
  storeName: string;
  locationCode: string;
  shelfNumber: string;
};
