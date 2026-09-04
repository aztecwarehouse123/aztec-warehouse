export const BOX_SIZE_OPTIONS = [
  'SP-94',
  'SP-1534',
  'SP-716',
  'SPRAY BOX',
  'LOGO MEDIUM',
  'LOGO XL',
  '005',
  '007',
  'Water box',
  'Monster box',
  'FBA250',
  'POLYBAG',
];

export const PACKING_MATERIAL_OPTIONS = [
  'BUBBLE WRAP',
  'SHRINK WRAP',
  'PAPER',
];

const toSelectOptions = (values: string[]) =>
  [{ value: '', label: 'Select...' }, ...values.map(value => ({ value, label: value }))];

export const boxSizeSelectOptions = toSelectOptions(BOX_SIZE_OPTIONS);
export const packingMaterialSelectOptions = toSelectOptions(PACKING_MATERIAL_OPTIONS);
