import React, { useState, useEffect } from 'react';
import { StockItem } from '../../types';
import { generateShelfOptions } from '../../utils/shelfUtils';

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
  const [shelfOptions, setShelfOptions] = useState(generateShelfOptions(item.locationCode));

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

  useEffect(() => {
    setName(item.name);
    setQuantity(item.quantity.toString());
    setPrice(item.price.toString());
    setLocationCode(item.locationCode);
    setShelfNumber(item.shelfNumber.toString());
    setSupplier(item.supplier);
    setShelfOptions(generateShelfOptions(item.locationCode));
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
                value={supplier || ''}
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
                onChange={(e) => handleLocationChange(e.target.value)}
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="A3">A3</option>
                <option value="A4">A4</option>
                <option value="A5">A5</option>
                <option value="A6">A6</option>
                <option value="A7">A7</option>
                <option value="A8">A8</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
                <option value="B3">B3</option>
                <option value="B4">B4</option>
                <option value="B5">B5</option>
                <option value="B6">B6</option>
                <option value="B7">B7</option>
                <option value="B8">B8</option>
                <option value="C1">C1</option>
                <option value="C2">C2</option>
                <option value="C3">C3</option>
                <option value="C4">C4</option>
                <option value="C5">C5</option>
                <option value="C6">C6</option>
                <option value="C7">C7</option>
                <option value="C8">C8</option>
                <option value="D1">D1</option>
                <option value="D2">D2</option>
                <option value="D3">D3</option>
                <option value="D4">D4</option>
                <option value="D5">D5</option>
                <option value="D6">D6</option>
                <option value="D7">D7</option>
                <option value="D8">D8</option>
                <option value="E1">E1</option>
                <option value="E2">E2</option>
                <option value="E3">E3</option>
                <option value="E4">E4</option>
                <option value="E5">E5</option>
                <option value="E6">E6</option>
                <option value="E7">E7</option>
                <option value="E8">E8</option>
                <option value="F1">F1</option>
                <option value="F2">F2</option>
                <option value="F3">F3</option>
                <option value="F4">F4</option>
                <option value="F5">F5</option>
                <option value="F6">F6</option>
                <option value="F7">F7</option>
                <option value="F8">F8</option>
                <option value="G1">G1</option>
                <option value="G2">G2</option>
                <option value="G3">G3</option>
                <option value="G4">G4</option>
                <option value="G5">G5</option>
                <option value="G6">G6</option>
                <option value="G7">G7</option>
                <option value="G8">G8</option>
                <option value="H1">H1</option>
                <option value="H2">H2</option>
                <option value="H3">H3</option>
                <option value="H4">H4</option>
                <option value="H5">H5</option>
                <option value="H6">H6</option>
                <option value="H7">H7</option>
                <option value="H8">H8</option>
                <option value="I1">I1</option>
                <option value="I2">I2</option>
                <option value="I3">I3</option>
                <option value="I4">I4</option>
                <option value="I5">I5</option>
                <option value="I6">I6</option>
                <option value="I7">I7</option>
                <option value="I8">I8</option>
                <option value="J1">J1</option>
                <option value="J2">J2</option>
                <option value="J3">J3</option>
                <option value="J4">J4</option>
                <option value="J5">J5</option>
                <option value="J6">J6</option>
                <option value="J7">J7</option>
                <option value="J8">J8</option>
                <option value="K1">K1</option>
                <option value="K2">K2</option>
                <option value="K3">K3</option>
                <option value="K4">K4</option>
                <option value="K5">K5</option>
                <option value="K6">K6</option>
                <option value="K7">K7</option>
                <option value="K8">K8</option>
                <option value="L1">L1</option>
                <option value="L2">L2</option>
                <option value="L3">L3</option>
                <option value="L4">L4</option>
                <option value="L5">L5</option>
                <option value="L6">L6</option>
                <option value="L7">L7</option>
                <option value="L8">L8</option>
                <option value="M1">M1</option>
                <option value="M2">M2</option>
                <option value="M3">M3</option>
                <option value="M4">M4</option>
                <option value="M5">M5</option>
                <option value="M6">M6</option>
                <option value="M7">M7</option>
                <option value="M8">M8</option>
                <option value="N1">N1</option>
                <option value="N2">N2</option>
                <option value="N3">N3</option>
                <option value="N4">N4</option>
                <option value="N5">N5</option>
                <option value="N6">N6</option>
                <option value="N7">N7</option>
                <option value="N8">N8</option>
                <option value="O1">O1</option>
                <option value="O2">O2</option>
                <option value="O3">O3</option>
                <option value="O4">O4</option>
                <option value="O5">O5</option>
                <option value="O6">O6</option>
                <option value="O7">O7</option>
                <option value="O8">O8</option>
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="P3">P3</option>
                <option value="P4">P4</option>
                <option value="P5">P5</option>
                <option value="P6">P6</option>
                <option value="P7">P7</option>
                <option value="P8">P8</option>
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
                <option value="Q5">Q5</option>
                <option value="Q6">Q6</option>
                <option value="Q7">Q7</option>
                <option value="Q8">Q8</option>
                <option value="R1">R1</option>
                <option value="R2">R2</option>
                <option value="R3">R3</option>
                <option value="R4">R4</option>
                <option value="R5">R5</option>
                <option value="R6">R6</option>
                <option value="R7">R7</option>
                <option value="R8">R8</option>
                <option value="S1">S1</option>
                <option value="S2">S2</option>
                <option value="S3">S3</option>
                <option value="S4">S4</option>
                <option value="S5">S5</option>
                <option value="S6">S6</option>
                <option value="S7">S7</option>
                <option value="S8">S8</option>
                <option value="T1">T1</option>
                <option value="T2">T2</option>
                <option value="T3">T3</option>
                <option value="T4">T4</option>
                <option value="T5">T5</option>
                <option value="T6">T6</option>
                <option value="T7">T7</option>
                <option value="T8">T8</option>
                <option value="U1">U1</option>
                <option value="U2">U2</option>
                <option value="U3">U3</option>
                <option value="U4">U4</option>
                <option value="U5">U5</option>
                <option value="U6">U6</option>
                <option value="U7">U7</option>
                <option value="U8">U8</option>
                <option value="V1">V1</option>
                <option value="V2">V2</option>
                <option value="V3">V3</option>
                <option value="V4">V4</option>
                <option value="V5">V5</option>
                <option value="V6">V6</option>
                <option value="V7">V7</option>
                <option value="V8">V8</option>
                <option value="W1">W1</option>
                <option value="W2">W2</option>
                <option value="W3">W3</option>
                <option value="W4">W4</option>
                <option value="W5">W5</option>
                <option value="W6">W6</option>
                <option value="W7">W7</option>
                <option value="W8">W8</option>
                <option value="X1">X1</option>
                <option value="X2">X2</option>
                <option value="X3">X3</option>
                <option value="X4">X4</option>
                <option value="X5">X5</option>
                <option value="X6">X6</option>
                <option value="X7">X7</option>
                <option value="X8">X8</option>
                <option value="Y1">Y1</option>
                <option value="Y2">Y2</option>
                <option value="Y3">Y3</option>
                <option value="Y4">Y4</option>
                <option value="Y5">Y5</option>
                <option value="Y6">Y6</option>
                <option value="Y7">Y7</option>
                <option value="Y8">Y8</option>
                <option value="Z1">Z1</option>
                <option value="Z2">Z2</option>
                <option value="Z3">Z3</option>
                <option value="Z4">Z4</option>
                <option value="Z5">Z5</option>
                <option value="Z6">Z6</option>
                <option value="Z7">Z7</option>
                <option value="Z8">Z8</option>
                <option value="Awaiting Location">Awaiting Location</option>
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
                {shelfOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
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