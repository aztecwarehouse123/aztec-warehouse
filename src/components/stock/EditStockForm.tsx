import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { StockItem } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

interface FormData {
  name: string;
  quantity: string;
  price: string;
  unit: string;
  supplier?: string;
  locationCode: string;
  shelfNumber: string;
  asin?: string;
  status: 'pending' | 'active';
  damagedItems: string;
  fulfillmentType: 'fba' | 'mf';
  storeName: string;
}

interface EditStockFormProps {
  item: StockItem;
  onSubmit: (data: StockItem, originalItem: StockItem) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
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
  { value: 'Awaiting Location', label: 'Awaiting Location' }
];

const shelfOptions = Array.from({ length: 6 }, (_, i) => ({
  value: i.toString(),
  label: `${i}`
}));

const predefinedStores = ['supply & serve', 'APHY', 'AZTEC', 'ZK'];

const supplierOptions = [
  { value: 'Rayburns Trading', label: 'Rayburns Trading' },
  { value: 'Intamarque', label: 'Intamarque' },
  { value: 'Sian Wholesale', label: 'Sian Wholesale' },
  { value: 'DMG', label: 'DMG' },
  { value: 'CVT', label: 'CVT' },
  { value: 'Wholesale Trading Supplies', label: 'Wholesale Trading Supplies' },
  { value: 'HJA', label: 'HJA' },
  { value: 'Price Check', label: 'Price Check' },
  { value: 'other', label: 'Other' }
];

const EditStockForm: React.FC<EditStockFormProps> = ({ 
  item, 
  onSubmit, 
  onCancel, 
  isLoading = false 
}) => {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const initialStoreName = item.storeName;
  const isCustomStore = initialStoreName && !predefinedStores.includes(initialStoreName);

  // Supplier initialization logic
  const supplierInOptions = supplierOptions.some(opt => opt.value === (item.supplier || ''));
  const initialSupplier = supplierInOptions ? (item.supplier || '') : 'other';
  const initialOtherSupplier = supplierInOptions ? '' : (item.supplier || '');

  const [formData, setFormData] = useState<FormData>({
    name: item.name,
    quantity: item.quantity.toString(),
    price: item.price.toString(),
    unit: item.unit || '',
    supplier: initialSupplier,
    locationCode: item.locationCode,
    shelfNumber: item.shelfNumber,
    asin: item.asin || '',
    status: item.status,
    damagedItems: item.damagedItems.toString(),
    fulfillmentType: item.fulfillmentType,
    storeName: isCustomStore ? 'other' : (item.storeName || 'supply & serve')
  });
  const [showOtherStoreInput, setShowOtherStoreInput] = useState(isCustomStore);
  const [otherStoreName, setOtherStoreName] = useState(isCustomStore ? initialStoreName : '');
  const [showOtherSupplierInput, setShowOtherSupplierInput] = useState(initialSupplier === 'other');
  const [otherSupplier, setOtherSupplier] = useState(initialOtherSupplier);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'damagedItems') {
      const damagedValue = Number(value);
      const currentQuantity = Number(formData.quantity);
      
      if (damagedValue < 0) {
        setValidationMessage("Damaged items cannot be negative");
        return;
      }
      
      setValidationMessage(null);
      
      // Update both damaged items and quantity
      setFormData(prev => ({
        ...prev,
        damagedItems: value,
        quantity: (currentQuantity - (damagedValue - Number(prev.damagedItems))).toString()
      }));
      return;
    }
    
    if (name === 'supplier') {
      setShowOtherSupplierInput(value === 'other');
      if (value !== 'other') setOtherSupplier('');
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      try {
        const data: StockItem = {
          id: item.id,
          name: formData.name,
          quantity: parseInt(formData.quantity),
          price: user?.role === 'admin' ? parseFloat(formData.price) : item.price,
          unit: formData.unit || null,
          supplier: formData.supplier === 'other' ? otherSupplier : formData.supplier || null,
          locationCode: formData.locationCode,
          shelfNumber: formData.shelfNumber,
          asin: formData.asin || null,
          status: user?.role === 'admin' ? formData.status : 'pending',
          damagedItems: parseInt(formData.damagedItems),
          fulfillmentType: formData.fulfillmentType,
          lastUpdated: new Date(),
          storeName: formData.storeName === 'other' ? otherStoreName : formData.storeName,
          barcode: item.barcode
        };

        await onSubmit(data, item);
      } catch (error) {
        console.error('Error updating stock:', error);
        setValidationMessage('Failed to update stock. Please try again.');
      }
    }
  };

  const validate = () => {
    if (!formData.name.trim()) {
      setValidationMessage('Product name is required');
      return false;
    }
    if (!formData.quantity || parseInt(formData.quantity) < 0) {
      setValidationMessage('Quantity must be a positive number');
      return false;
    }
    if (user?.role === 'admin' && (!formData.price || parseFloat(formData.price) < 0)) {
      setValidationMessage('Price must be a positive number');
      return false;
    }
    if (!formData.locationCode || !formData.shelfNumber) {
      setValidationMessage('Location and shelf number are required');
      return false;
    }
    setValidationMessage(null);
    return true;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Product Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Enter product name"
          required
          fullWidth
        />
         {user?.role === 'admin' ? (
          <Select
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'active', label: 'Active' }
            ]}
            fullWidth
            required
          />
        ) : (
          <Input
            label="Status"
            name="status"
            value="pending"
            disabled
            fullWidth
          />
        )}
        
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Quantity"
          name="quantity"
          type="number"
          value={formData.quantity}
          onChange={handleChange}
          placeholder="Enter quantity"
          min="0"
          required
          fullWidth
        />
        
        {user?.role === 'admin' && (
          <Input
            label="Price"
            name="price"
            type="number"
            value={formData.price}
            onChange={handleChange}
            placeholder="Enter price"
            min="0"
            step="0.01"
            fullWidth
          />
        )}
        <Input
          label="Unit (Optional)"
          name="unit"
          value={formData.unit}
          onChange={handleChange}
          placeholder="e.g. ML, GM, PC, etc."
          fullWidth
        />
        <Select
          label="Fulfillment Type"
          name="fulfillmentType"
          value={formData.fulfillmentType}
          onChange={handleChange}
          options={[
            { value: 'fba', label: 'FBA' },
            { value: 'mf', label: 'MF' }
          ]}
          fullWidth
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Location Code"
          name="locationCode"
          value={formData.locationCode}
          onChange={handleChange}
          options={locationOptions}
          required
          fullWidth
        />
        
        <Select
          label="Shelf Number"
          name="shelfNumber"
          value={formData.shelfNumber}
          onChange={handleChange}
          options={shelfOptions}
          required
          fullWidth
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="ASIN"
          name="asin"
          value={formData.asin}
          onChange={handleChange}
          placeholder="Enter Amazon ASIN"
          fullWidth
        />
        <div>
          <Input
            label="Damaged Items"
            name="damagedItems"
            type="number"
            value={formData.damagedItems}
            onChange={handleChange}
            placeholder="Enter number of damaged items"
            min="0"
            fullWidth
            className={validationMessage ? 'border-red-500 focus:border-red-500' : ''}
          />
          {validationMessage && (
            <p className="mt-1 text-sm text-red-500">{validationMessage}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <div>
          <Select
            label="Supplier"
            name="supplier"
            value={formData.supplier}
            onChange={handleChange}
            options={supplierOptions}
            required
            fullWidth
          />
          
        </div>
        <div>
          <label className={`block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1`}>
            Store Name
          </label>
          <Select
            value={formData.storeName}
            onChange={(e) => {
              const value = e.target.value;
              setFormData(prev => ({ ...prev, storeName: value }));
              setShowOtherStoreInput(value === 'other');
              if (value !== 'other') {
                setOtherStoreName('');
              }
            }}
            options={[
              { value: 'supply & serve', label: 'Supply & Serve' },
              { value: 'APHY', label: 'APHY' },
              { value: 'AZTEC', label: 'AZTEC' },
              { value: 'ZK', label: 'ZK' },
              { value: 'other', label: 'Other' }
            ]}
          />
          
        </div>
       
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {showOtherSupplierInput && (
            <Input
              label="Other Supplier"
              value={otherSupplier}
              onChange={e => setOtherSupplier(e.target.value)}
              placeholder="Enter supplier name"
              required={showOtherSupplierInput}
              fullWidth
            />
          )}
      
        {showOtherStoreInput && !showOtherSupplierInput && (
          <div>
            <label className={`block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1`}>
              Other Store Name
            </label>
            <Input
              type="text"
              value={otherStoreName}
              onChange={(e) => setOtherStoreName(e.target.value)}
              placeholder="Enter store name"
              required={showOtherStoreInput}
            />
          </div>
        )}
        {showOtherStoreInput && showOtherSupplierInput && (
          <div>
            <label className={`block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1`}>
              Other Store Name
            </label>
            <Input
              type="text"
              value={otherStoreName}
              onChange={(e) => setOtherStoreName(e.target.value)}
              placeholder="Enter store name"
              required={showOtherStoreInput}
            />
          </div>
        )}
        
        
        
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
      
      </div>
      
      
      <div className="flex justify-end">
        <Button 
          type="submit" 
          isLoading={isLoading}
          icon={<Plus size={18} />}
        >
          Update Product
        </Button>
      </div>
    </form>
  );
};

export default EditStockForm; 