import type { PendingStockUpdate } from '../types';

/** Merge multiple pending rows that target the same inventory document (single read/update in transaction). */
export type MergedPendingStockUpdate = {
  stockItemId: string;
  stockItem: PendingStockUpdate['stockItem'];
  totalDeducted: number;
  /** First row — used for human-readable log fields (reason, store, location). */
  representative: PendingStockUpdate;
};

export function mergePendingStockUpdates(updates: PendingStockUpdate[]): MergedPendingStockUpdate[] {
  const map = new Map<string, MergedPendingStockUpdate>();
  for (const u of updates) {
    const id = u.stockItem.id;
    const existing = map.get(id);
    if (existing) {
      existing.totalDeducted += u.deductedQuantity;
    } else {
      map.set(id, {
        stockItemId: id,
        stockItem: u.stockItem,
        totalDeducted: u.deductedQuantity,
        representative: u,
      });
    }
  }
  return Array.from(map.values());
}
