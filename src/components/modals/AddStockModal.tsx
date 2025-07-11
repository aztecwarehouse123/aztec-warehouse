import React, { useState } from 'react';
import { StockItem } from '../../types';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: Omit<StockItem, 'id' | 'lastUpdated'>) => void;
}

const locationOptions = [
  { value: 'A1', label: 'A1' },
  { value: 'A2', label: 'A2' },
  { value: 'B1', label: 'B1' },
  { value: 'B2', label: 'B2' },
  { value: 'C1', label: 'C1' },
  { value: 'C2', label: 'C2' },
  { value: 'C3', label: 'C3' },
  { value: 'C4', label: 'C4' },
  { value: 'C5', label: 'C5' },
  { value: 'D1', label: 'D1' },
  { value: 'D2', label: 'D2' },
  { value: 'D3', label: 'D3' },
  { value: 'D4', label: 'D4' },
  { value: 'D5', label: 'D5' },
  { value: 'E1', label: 'E1' },
  { value: 'E2', label: 'E2' },
  { value: 'E3', label: 'E3' },
  { value: 'E4', label: 'E4' },
  { value: 'E5', label: 'E5' },
  { value: 'F1', label: 'F1' },
  { value: 'F2', label: 'F2' },
  { value: 'F3', label: 'F3' },
  { value: 'F4', label: 'F4' },
  { value: 'F5', label: 'F5' },
  { value: 'G1', label: 'G1' },
  { value: 'G2', label: 'G2' },
  { value: 'G3', label: 'G3' },
  { value: 'G4', label: 'G4' },
  { value: 'G5', label: 'G5' },
  { value: 'H1', label: 'H1' },
  { value: 'H2', label: 'H2' },
  { value: 'H3', label: 'H3' },
  { value: 'H4', label: 'H4' },
  { value: 'H5', label: 'H5' },
  { value: 'I1', label: 'I1' },
  { value: 'I2', label: 'I2' },
  { value: 'I3', label: 'I3' },
  { value: 'I4', label: 'I4' },
  { value: 'I5', label: 'I5' },
  { value: 'J1', label: 'J1' },
  { value: 'J2', label: 'J2' },
  { value: 'J3', label: 'J3' },
  { value: 'J4', label: 'J4' },
  { value: 'J5', label: 'J5' },
  { value: 'K1', label: 'K1' },
  { value: 'K2', label: 'K2' },
  { value: 'K3', label: 'K3' },
  { value: 'K4', label: 'K4' },
  { value: 'K5', label: 'K5' },
  { value: 'L1', label: 'L1' },
  { value: 'L2', label: 'L2' },
  { value: 'L3', label: 'L3' },
  { value: 'L4', label: 'L4' },
  { value: 'L5', label: 'L5' },
  { value: 'M1', label: 'M1' },
  { value: 'M2', label: 'M2' },
  { value: 'M3', label: 'M3' },
  { value: 'M4', label: 'M4' },
  { value: 'M5', label: 'M5' },
  { value: 'N1', label: 'N1' },
  { value: 'N2', label: 'N2' },
  { value: 'N3', label: 'N3' },
  { value: 'N4', label: 'N4' },
  { value: 'N5', label: 'N5' },
  { value: 'O1', label: 'O1' },
  { value: 'O2', label: 'O2' },
  { value: 'O3', label: 'O3' },
  { value: 'O4', label: 'O4' },
  { value: 'O5', label: 'O5' },
  { value: 'P1', label: 'P1' },
  { value: 'P2', label: 'P2' },
  { value: 'P3', label: 'P3' },
  { value: 'P4', label: 'P4' },
  { value: 'P5', label: 'P5' },
  { value: 'Q1', label: 'Q1' },
  { value: 'Q2', label: 'Q2' },
  { value: 'R1', label: 'R1' },
  { value: 'R2', label: 'R2' },
  { value: 'S1', label: 'S1' },
  { value: 'S2', label: 'S2' },
  { value: 'T1', label: 'T1' },
  { value: 'T2', label: 'T2' }
];

const shelfOptions = Array.from({ length: 6 }, (_, i) => ({
  value: (i + 1).toString(),
  label: `${i + 1}`
}));

const AddStockModal: React.FC<AddStockModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [locationCode, setLocationCode] = useState('A1');
  const [shelfNumber, setShelfNumber] = useState('1');
  const [supplier, setSupplier] = useState('');
  const [barcode, setBarcode] = useState('');
  const [asin, setAsin] = useState('');

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
    setShelfNumber('1');
    setSupplier('');
    setBarcode('');
    setAsin('');
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
                onChange={(e) => setLocationCode(e.target.value)}
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