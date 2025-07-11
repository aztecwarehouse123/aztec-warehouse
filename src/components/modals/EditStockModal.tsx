import React, { useState, useEffect } from 'react';
import { StockItem } from '../../types';

interface EditStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: StockItem) => void;
  item: StockItem;
}

const EditStockModal: React.FC<EditStockModalProps> = ({ isOpen, onClose, onSave, item }) => {
  const [name, setName] = useState(item.name);
  
  const [quantity, setQuantity] = useState(item.quantity.toString());
  const [price, setPrice] = useState(item.price.toString());
  const [locationCode, setLocationCode] = useState(item.locationCode);
  const [shelfNumber, setShelfNumber] = useState(item.shelfNumber.toString());
  
  const [supplier, setSupplier] = useState(item.supplier);

  useEffect(() => {
    setName(item.name);
    setQuantity(item.quantity.toString());
    setPrice(item.price.toString());
    setLocationCode(item.locationCode);
    setShelfNumber(item.shelfNumber.toString());
    setSupplier(item.supplier);
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...item,
      name,
      quantity: parseInt(quantity),
      price: parseFloat(price),
      locationCode,
      shelfNumber: shelfNumber,
      supplier
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Edit Stock Item</h2>
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
                required
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
                required
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
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
                <option value="C1">C1</option>
                <option value="C2">C2</option>
                <option value="C3">C3</option>
                <option value="C4">C4</option>
                <option value="C5">C5</option>
                <option value="D1">D1</option>
                <option value="D2">D2</option>
                <option value="D3">D3</option>
                <option value="D4">D4</option>
                <option value="D5">D5</option>
                <option value="E1">E1</option>
                <option value="E2">E2</option>
                <option value="E3">E3</option>
                <option value="E4">E4</option>
                <option value="E5">E5</option>
                <option value="F1">F1</option>
                <option value="F2">F2</option>
                <option value="F3">F3</option>
                <option value="F4">F4</option>
                <option value="F5">F5</option>
                <option value="G1">G1</option>
                <option value="G2">G2</option>
                <option value="G3">G3</option>
                <option value="G4">G4</option>
                <option value="G5">G5</option>
                <option value="H1">H1</option>
                <option value="H2">H2</option>
                <option value="H3">H3</option>
                <option value="H4">H4</option>
                <option value="H5">H5</option>
                <option value="I1">I1</option>
                <option value="I2">I2</option>
                <option value="I3">I3</option>
                <option value="I4">I4</option>
                <option value="I5">I5</option>
                <option value="J1">J1</option>
                <option value="J2">J2</option>
                <option value="J3">J3</option>
                <option value="J4">J4</option>
                <option value="J5">J5</option>
                <option value="K1">K1</option>
                <option value="K2">K2</option>
                <option value="K3">K3</option>
                <option value="K4">K4</option>
                <option value="K5">K5</option>
                <option value="L1">L1</option>
                <option value="L2">L2</option>
                <option value="L3">L3</option>
                <option value="L4">L4</option>
                <option value="L5">L5</option>
                <option value="M1">M1</option>
                <option value="M2">M2</option>
                <option value="M3">M3</option>
                <option value="M4">M4</option>
                <option value="M5">M5</option>
                <option value="N1">N1</option>
                <option value="N2">N2</option>
                <option value="N3">N3</option>
                <option value="N4">N4</option>
                <option value="N5">N5</option>
                <option value="O1">O1</option>
                <option value="O2">O2</option>
                <option value="O3">O3</option>
                <option value="O4">O4</option>
                <option value="O5">O5</option>
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="P3">P3</option>
                <option value="P4">P4</option>
                <option value="P5">P5</option>
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="R1">R1</option>
                <option value="R2">R2</option>
                <option value="S1">S1</option>
                <option value="S2">S2</option>
                <option value="T1">T1</option>
                <option value="T2">T2</option>
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
                {Array.from({ length: 6 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num.toString()}>
                    {num}
                  </option>
                ))}
              </select>
            </div>
            
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditStockModal; 