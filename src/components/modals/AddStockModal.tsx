import React, { useState } from 'react';
import { StockItem } from '../../types';
import { generateShelfOptions } from '../../utils/shelfUtils';
import { getWarehouseLocationOptions } from '../../utils/locationUtils';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: Omit<StockItem, 'id' | 'lastUpdated'>) => void;
}

const locationOptions = getWarehouseLocationOptions();

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