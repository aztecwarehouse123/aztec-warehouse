export const AWAITING_LOCATION_CODES = [
  'Awaiting Location',
  'Awaiting Locations Sparklin',
  'Awaiting Locations Aztec',
];

export const TENT_LOCATION_CODES = ['TENT-1', 'TENT-2', 'TENT-3'];

/** Named warehouse locations shown after TENT-3 */
export const POST_TENT_LOCATION_CODES = ['Temple Rd'];

export function getTentAndNamedLocationCodes(): string[] {
  return [...TENT_LOCATION_CODES, ...POST_TENT_LOCATION_CODES];
}

/** A–Z: shelves 1–12 */
export function getLetterNumberLocationCodes(): string[] {
  const codes: string[] = [];
  for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    for (let i = 1; i <= 12; i++) {
      codes.push(`${letter}${i}`);
    }
  }
  return codes;
}

/** Warehouse Locations page order: awaiting → TENT → Temple Rd → A–Z */
export function getAllWarehouseLocationCodes(): string[] {
  return [
    ...AWAITING_LOCATION_CODES,
    ...getTentAndNamedLocationCodes(),
    ...getLetterNumberLocationCodes(),
  ];
}

/** Form/select order: A–Z → TENT → Temple Rd → awaiting */
export function getWarehouseLocationOptions(): Array<{ value: string; label: string }> {
  return [
    ...getLetterNumberLocationCodes(),
    ...getTentAndNamedLocationCodes(),
    ...AWAITING_LOCATION_CODES,
  ].map(code => ({ value: code, label: code }));
}

export function getLocationDisplayLabel(locationCode: string): string {
  if (AWAITING_LOCATION_CODES.includes(locationCode)) return locationCode;
  if (getTentAndNamedLocationCodes().includes(locationCode)) return locationCode;
  return `Location ${locationCode}`;
}

/** Fixed order: awaiting → TENT-* → Temple Rd → everything else A–Z (numeric shelf order) */
export function compareWarehouseLocationCodes(a: string, b: string): number {
  const priority = [...AWAITING_LOCATION_CODES, ...getTentAndNamedLocationCodes()];
  const ia = priority.indexOf(a);
  const ib = priority.indexOf(b);
  const aIn = ia !== -1;
  const bIn = ib !== -1;
  if (aIn && bIn) return ia - ib;
  if (aIn) return -1;
  if (bIn) return 1;

  const parseLetterNumber = (code: string) => {
    const match = code.match(/^([A-Z])(\d+)$/);
    return match ? { letter: match[1], number: parseInt(match[2], 10) } : null;
  };

  const parsedA = parseLetterNumber(a);
  const parsedB = parseLetterNumber(b);
  if (parsedA && parsedB) {
    if (parsedA.letter !== parsedB.letter) {
      return parsedA.letter.localeCompare(parsedB.letter);
    }
    return parsedA.number - parsedB.number;
  }

  return a.localeCompare(b);
}
