import type { FirestoreJobItem } from '../types';
import type { Job } from '../types';

export function buildVerifiedJobItems(
  job: Job,
  locallyVerifiedBarcodes: string[]
): { updatedItems: FirestoreJobItem[]; invalidCount: number } {
  const updatedItems: FirestoreJobItem[] = job.items.map(item => {
    const validatedItem: FirestoreJobItem = {
      barcode: item.barcode || '',
      name: item.name ?? null,
      asin: item.asin ?? null,
      quantity: Number(item.quantity) || 1,
      verified: locallyVerifiedBarcodes.includes(item.barcode) || item.verified,
      reason: item.reason || 'Unknown',
      storeName: item.storeName || 'Unknown',
    };
    if (item.locationCode) validatedItem.locationCode = item.locationCode;
    if (item.shelfNumber) validatedItem.shelfNumber = item.shelfNumber;
    if (item.stockItemId) validatedItem.stockItemId = item.stockItemId;
    return validatedItem;
  });

  const invalidCount = updatedItems.filter(
    item => !item.barcode || !item.reason || !item.storeName
  ).length;

  return { updatedItems, invalidCount };
}

export function getLocallyVerifiedBarcodesForJob(
  jobId: string,
  locallyVerifiedItems: Set<string>
): string[] {
  return Array.from(locallyVerifiedItems)
    .filter(itemKey => itemKey.startsWith(`${jobId}-`))
    .map(itemKey => itemKey.slice(jobId.length + 1));
}
