import type { JobItem } from '../../../types';

export function getNewJobItemKey(item: JobItem, index: number): string {
  return item.stockItemId ?? `${item.barcode}-${item.locationCode}-${item.shelfNumber}-${index}`;
}

/** Every product in the job must be ticked before finishing picking. */
export function allRequiredNewJobItemsConfirmed(
  items: JobItem[],
  confirmedKeys: Set<string>
): boolean {
  if (items.length === 0) return false;
  return items.every((item, index) => confirmedKeys.has(getNewJobItemKey(item, index)));
}
