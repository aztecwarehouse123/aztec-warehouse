/**
 * Utility functions for handling shelf numbers based on location codes
 */

/**
 * Generates shelf options based on the location code
 * Locations O1...O8 and P1...P8 have shelves 0-7 (8 shelves)
 * All other locations have shelves 0-5 (6 shelves)
 */
export const generateShelfOptions = (locationCode: string) => {
  // Check if location is O1-O8 or P1-P8
  const isExtendedShelfLocation = (locationCode.startsWith('O') || locationCode.startsWith('P')) && 
                                  locationCode.length === 2 && 
                                  /^[1-8]$/.test(locationCode[1]);
  
  const maxShelf = isExtendedShelfLocation ? 7 : 5;
  
  return Array.from({ length: maxShelf + 1 }, (_, i) => ({
    value: i.toString(),
    label: i.toString()
  }));
};

/**
 * Gets the maximum shelf number for a given location code
 */
export const getMaxShelfNumber = (locationCode: string): number => {
  const isExtendedShelfLocation = (locationCode.startsWith('O') || locationCode.startsWith('P')) && 
                                  locationCode.length === 2 && 
                                  /^[1-8]$/.test(locationCode[1]);
  
  return isExtendedShelfLocation ? 7 : 5;
};

/**
 * Validates if a shelf number is valid for a given location code
 */
export const isValidShelfNumber = (locationCode: string, shelfNumber: string): boolean => {
  const maxShelf = getMaxShelfNumber(locationCode);
  const shelfNum = parseInt(shelfNumber);
  return !isNaN(shelfNum) && shelfNum >= 0 && shelfNum <= maxShelf;
};
