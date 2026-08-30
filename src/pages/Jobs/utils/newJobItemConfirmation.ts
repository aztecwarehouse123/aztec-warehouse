import type { JobItem } from '../../../types';

export function getNewJobItemKey(item: JobItem, index: number): string {
  return item.stockItemId ?? `${item.barcode}-${item.locationCode}-${item.shelfNumber}-${index}`;
}

/** Items with box size or packing material must be ticked before finishing picking. */
export function newJobItemRequiresConfirmation(item: JobItem): boolean {
  return Boolean(item.boxSize?.trim()) || Boolean(item.packingMaterial?.trim());
}

export function allRequiredNewJobItemsConfirmed(
  items: JobItem[],
  confirmedKeys: Set<string>
): boolean {
  return items.every((item, index) => {
    if (!newJobItemRequiresConfirmation(item)) return true;
    return confirmedKeys.has(getNewJobItemKey(item, index));
  });
}
