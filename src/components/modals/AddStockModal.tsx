import React, { useState } from 'react';
import { StockItem } from '../../types';
import { generateShelfOptions } from '../../utils/shelfUtils';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: Omit<StockItem, 'id' | 'lastUpdated'>) => void;
}

const locationOptions = [
  { value: 'A1', label: 'A1' },
  { value: 'A2', label: 'A2' },
  { value: 'A3', label: 'A3' },
  { value: 'A4', label: 'A4' },
  { value: 'A5', label: 'A5' },
  { value: 'A6', label: 'A6' },
  { value: 'A7', label: 'A7' },
  { value: 'A8', label: 'A8' },
  { value: 'B1', label: 'B1' },
  { value: 'B2', label: 'B2' },
  { value: 'B3', label: 'B3' },
  { value: 'B4', label: 'B4' },
  { value: 'B5', label: 'B5' },
  { value: 'B6', label: 'B6' },
  { value: 'B7', label: 'B7' },
  { value: 'B8', label: 'B8' },
  { value: 'C1', label: 'C1' },
  { value: 'C2', label: 'C2' },
  { value: 'C3', label: 'C3' },
  { value: 'C4', label: 'C4' },
  { value: 'C5', label: 'C5' },
  { value: 'C6', label: 'C6' },
  { value: 'C7', label: 'C7' },
  { value: 'C8', label: 'C8' },
  { value: 'D1', label: 'D1' },
  { value: 'D2', label: 'D2' },
  { value: 'D3', label: 'D3' },
  { value: 'D4', label: 'D4' },
  { value: 'D5', label: 'D5' },
  { value: 'D6', label: 'D6' },
  { value: 'D7', label: 'D7' },
  { value: 'D8', label: 'D8' },
  { value: 'E1', label: 'E1' },
  { value: 'E2', label: 'E2' },
  { value: 'E3', label: 'E3' },
  { value: 'E4', label: 'E4' },
  { value: 'E5', label: 'E5' },
  { value: 'E6', label: 'E6' },
  { value: 'E7', label: 'E7' },
  { value: 'E8', label: 'E8' },
  { value: 'F1', label: 'F1' },
  { value: 'F2', label: 'F2' },
  { value: 'F3', label: 'F3' },
  { value: 'F4', label: 'F4' },
  { value: 'F5', label: 'F5' },
  { value: 'F6', label: 'F6' },
  { value: 'F7', label: 'F7' },
  { value: 'F8', label: 'F8' },
  { value: 'G1', label: 'G1' },
  { value: 'G2', label: 'G2' },
  { value: 'G3', label: 'G3' },
  { value: 'G4', label: 'G4' },
  { value: 'G5', label: 'G5' },
  { value: 'G6', label: 'G6' },
  { value: 'G7', label: 'G7' },
  { value: 'G8', label: 'G8' },
  { value: 'H1', label: 'H1' },
  { value: 'H2', label: 'H2' },
  { value: 'H3', label: 'H3' },
  { value: 'H4', label: 'H4' },
  { value: 'H5', label: 'H5' },
  { value: 'H6', label: 'H6' },
  { value: 'H7', label: 'H7' },
  { value: 'H8', label: 'H8' },
  { value: 'I1', label: 'I1' },
  { value: 'I2', label: 'I2' },
  { value: 'I3', label: 'I3' },
  { value: 'I4', label: 'I4' },
  { value: 'I5', label: 'I5' },
  { value: 'I6', label: 'I6' },
  { value: 'I7', label: 'I7' },
  { value: 'I8', label: 'I8' },
  { value: 'J1', label: 'J1' },
  { value: 'J2', label: 'J2' },
  { value: 'J3', label: 'J3' },
  { value: 'J4', label: 'J4' },
  { value: 'J5', label: 'J5' },
  { value: 'J6', label: 'J6' },
  { value: 'J7', label: 'J7' },
  { value: 'J8', label: 'J8' },
  { value: 'K1', label: 'K1' },
  { value: 'K2', label: 'K2' },
  { value: 'K3', label: 'K3' },
  { value: 'K4', label: 'K4' },
  { value: 'K5', label: 'K5' },
  { value: 'K6', label: 'K6' },
  { value: 'K7', label: 'K7' },
  { value: 'K8', label: 'K8' },
  { value: 'L1', label: 'L1' },
  { value: 'L2', label: 'L2' },
  { value: 'L3', label: 'L3' },
  { value: 'L4', label: 'L4' },
  { value: 'L5', label: 'L5' },
  { value: 'L6', label: 'L6' },
  { value: 'L7', label: 'L7' },
  { value: 'L8', label: 'L8' },
  { value: 'M1', label: 'M1' },
  { value: 'M2', label: 'M2' },
  { value: 'M3', label: 'M3' },
  { value: 'M4', label: 'M4' },
  { value: 'M5', label: 'M5' },
  { value: 'M6', label: 'M6' },
  { value: 'M7', label: 'M7' },
  { value: 'M8', label: 'M8' },
  { value: 'N1', label: 'N1' },
  { value: 'N2', label: 'N2' },
  { value: 'N3', label: 'N3' },
  { value: 'N4', label: 'N4' },
  { value: 'N5', label: 'N5' },
  { value: 'N6', label: 'N6' },
  { value: 'N7', label: 'N7' },
  { value: 'N8', label: 'N8' },
  { value: 'O1', label: 'O1' },
  { value: 'O2', label: 'O2' },
  { value: 'O3', label: 'O3' },
  { value: 'O4', label: 'O4' },
  { value: 'O5', label: 'O5' },
  { value: 'O6', label: 'O6' },
  { value: 'O7', label: 'O7' },
  { value: 'O8', label: 'O8' },
  { value: 'P1', label: 'P1' },
  { value: 'P2', label: 'P2' },
  { value: 'P3', label: 'P3' },
  { value: 'P4', label: 'P4' },
  { value: 'P5', label: 'P5' },
  { value: 'P6', label: 'P6' },
  { value: 'P7', label: 'P7' },
  { value: 'P8', label: 'P8' },
  { value: 'Q1', label: 'Q1' },
  { value: 'Q2', label: 'Q2' },
  { value: 'Q3', label: 'Q3' },
  { value: 'Q4', label: 'Q4' },
  { value: 'Q5', label: 'Q5' },
  { value: 'Q6', label: 'Q6' },
  { value: 'Q7', label: 'Q7' },
  { value: 'Q8', label: 'Q8' },
  { value: 'R1', label: 'R1' },
  { value: 'R2', label: 'R2' },
  { value: 'R3', label: 'R3' },
  { value: 'R4', label: 'R4' },
  { value: 'R5', label: 'R5' },
  { value: 'R6', label: 'R6' },
  { value: 'R7', label: 'R7' },
  { value: 'R8', label: 'R8' },
  { value: 'S1', label: 'S1' },
  { value: 'S2', label: 'S2' },
  { value: 'S3', label: 'S3' },
  { value: 'S4', label: 'S4' },
  { value: 'S5', label: 'S5' },
  { value: 'S6', label: 'S6' },
  { value: 'S7', label: 'S7' },
  { value: 'S8', label: 'S8' },
  { value: 'T1', label: 'T1' },
  { value: 'T2', label: 'T2' },
  { value: 'T3', label: 'T3' },
  { value: 'T4', label: 'T4' },
  { value: 'T5', label: 'T5' },
  { value: 'T6', label: 'T6' },
  { value: 'T7', label: 'T7' },
  { value: 'T8', label: 'T8' },
  { value: 'U1', label: 'U1' },
  { value: 'U2', label: 'U2' },
  { value: 'U3', label: 'U3' },
  { value: 'U4', label: 'U4' },
  { value: 'U5', label: 'U5' },
  { value: 'U6', label: 'U6' },
  { value: 'U7', label: 'U7' },
  { value: 'U8', label: 'U8' },
  { value: 'V1', label: 'V1' },
  { value: 'V2', label: 'V2' },
  { value: 'V3', label: 'V3' },
  { value: 'V4', label: 'V4' },
  { value: 'V5', label: 'V5' },
  { value: 'V6', label: 'V6' },
  { value: 'V7', label: 'V7' },
  { value: 'V8', label: 'V8' },
  { value: 'W1', label: 'W1' },
  { value: 'W2', label: 'W2' },
  { value: 'W3', label: 'W3' },
  { value: 'W4', label: 'W4' },
  { value: 'W5', label: 'W5' },
  { value: 'W6', label: 'W6' },
  { value: 'W7', label: 'W7' },
  { value: 'W8', label: 'W8' },
  { value: 'X1', label: 'X1' },
  { value: 'X2', label: 'X2' },
  { value: 'X3', label: 'X3' },
  { value: 'X4', label: 'X4' },
  { value: 'X5', label: 'X5' },
  { value: 'X6', label: 'X6' },
  { value: 'X7', label: 'X7' },
  { value: 'X8', label: 'X8' },
  { value: 'Y1', label: 'Y1' },
  { value: 'Y2', label: 'Y2' },
  { value: 'Y3', label: 'Y3' },
  { value: 'Y4', label: 'Y4' },
  { value: 'Y5', label: 'Y5' },
  { value: 'Y6', label: 'Y6' },
  { value: 'Y7', label: 'Y7' },
  { value: 'Y8', label: 'Y8' },
  { value: 'Z1', label: 'Z1' },
  { value: 'Z2', label: 'Z2' },
  { value: 'Z3', label: 'Z3' },
  { value: 'Z4', label: 'Z4' },
  { value: 'Z5', label: 'Z5' },
  { value: 'Z6', label: 'Z6' },
  { value: 'Z7', label: 'Z7' },
  { value: 'Z8', label: 'Z8' },
  { value: 'Awaiting Location', label: 'Awaiting Location' },
  { value: 'Awaiting Locations Sparklin', label: 'Awaiting Locations Sparklin' },
  { value: 'Awaiting Locations Aztec', label: 'Awaiting Locations Aztec' }
];

// Shelf options will be generated dynamically based on selected location
const generateShelfOptionsForLocation = (locationCode: string) => {
  return generateShelfOptions(locationCode);
};

const AddStockModal: React.FC<AddStockModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [locationCode, setLocationCode] = useState('A1');
  const [shelfNumber, setShelfNumber] = useState('0');
  const [supplier, setSupplier] = useState('');
  const [barcode, setBarcode] = useState('');
  const [asin, setAsin] = useState('');
  const [shelfOptions, setShelfOptions] = useState(generateShelfOptions('A1'));

  // Update shelf options when location changes
  const handleLocationChange = (newLocation: string) => {
    setLocationCode(newLocation);
    const newShelfOptions = generateShelfOptions(newLocation);
    setShelfOptions(newShelfOptions);
    // Reset shelf number to 0 if current selection is invalid
    if (parseInt(shelfNumber) >= newShelfOptions.length) {
      setShelfNumber('0');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      name,
      quantity: parseInt(quantity),
      price: price ? parseFloat(price) : 0,
      locationCode,
      shelfNumber: shelfNumber,
      supplier: supplier || '',
      barcode: barcode || '',
      asin: asin || '',
      status: 'pending',
      damagedItems: 0
    });
    handleClose();
  };

  const handleClose = () => {
    setName('');
    setQuantity('');
    setPrice('');
    setLocationCode('A1');
    setShelfNumber('0');
    setSupplier('');
    setBarcode('');
    setAsin('');
    setShelfOptions(generateShelfOptions('A1'));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Add New Stock Item</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Supplier</label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Price</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Location</label>
              <select
                value={locationCode}
                onChange={(e) => handleLocationChange(e.target.value)}
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                {locationOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Shelf Number</label>
              <select
                value={shelfNumber}
                onChange={(e) => setShelfNumber(e.target.value)}
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                {shelfOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Barcode (optional)</label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700">ASIN (optional)</label>
              <input
                type="text"
                value={asin}
                onChange={(e) => setAsin(e.target.value)}
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter Amazon ASIN"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800"
            >
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStockModal; 