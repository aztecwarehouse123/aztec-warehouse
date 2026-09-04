export const PREDEFINED_STORES = [
  'supply & serve',
  'APHY',
  'AZTEC',
  'ZK',
  'Fahiz',
  'shopulence',
] as const;

export type PredefinedStore = (typeof PREDEFINED_STORES)[number];

/** Store filter lists on Stock, Outbound, Supply & Serve pages. */
export const STORE_FILTER_OPTIONS = [...PREDEFINED_STORES, 'other'] as const;

/** Store Name dropdown options (includes Other). */
export const storeNameSelectOptions = [
  { value: 'supply & serve', label: 'SUPPLY & SERVE' },
  { value: 'APHY', label: 'APHY' },
  { value: 'AZTEC', label: 'AZTEC' },
  { value: 'ZK', label: 'ZK' },
  { value: 'Fahiz', label: 'FAHIZ' },
  { value: 'shopulence', label: 'SHOPULENCE' },
  { value: 'other', label: 'OTHER' },
];

export const STORE_BADGE_COLORS: Record<string, string> = {
  'supply & serve': 'bg-blue-100 text-blue-700',
  APHY: 'bg-green-100 text-green-700',
  AZTEC: 'bg-purple-100 text-purple-700',
  ZK: 'bg-orange-100 text-orange-700',
  Fahiz: 'bg-pink-100 text-pink-700',
  shopulence: 'bg-teal-100 text-teal-700',
};

export function getStoreBadgeColor(storeName: string): string {
  return STORE_BADGE_COLORS[storeName] ?? 'bg-gray-100 text-gray-700';
}
