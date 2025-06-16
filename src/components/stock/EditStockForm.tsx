import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { StockItem } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

interface FormData {
  name: string;
  quantity: string;
  price: string;
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
  onSubmit: (data: StockItem) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const locationOptions = [
  { value: 'AA', label: 'AA' },
  { value: 'AB', label: 'AB' },
  { value: 'AC', label: 'AC' },
  { value: 'AD', label: 'AD' },
  { value: 'AE', label: 'AE' },
  { value: 'AF', label: 'AF' },
  { value: 'AG', label: 'AG' },
  { value: 'BA', label: 'BA' },
  { value: 'BB', label: 'BB' },
  { value: 'BC', label: 'BC' },
  { value: 'BD', label: 'BD' },
  { value: 'BE', label: 'BE' },
  { value: 'BF', label: 'BF' },
  { value: 'BG', label: 'BG' },
  { value: 'CA', label: 'CA' },
  { value: 'CB', label: 'CB' },
  { value: 'CC', label: 'CC' },
  { value: 'CD', label: 'CD' },
  { value: 'CE', label: 'CE' },
  { value: 'CF', label: 'CF' },
  { value: 'CG', label: 'CG' },
  { value: 'DA', label: 'DA' },
  { value: 'DB', label: 'DB' },
  { value: 'DC', label: 'DC' },
  { value: 'DD', label: 'DD' },
  { value: 'DE', label: 'DE' },
  { value: 'DF', label: 'DF' },
  { value: 'DG', label: 'DG' },
  { value: 'EA', label: 'EA' },
  { value: 'EB', label: 'EB' },
  { value: 'EC', label: 'EC' },
  { value: 'ED', label: 'ED' },
  { value: 'EE', label: 'EE' },
  { value: 'EF', label: 'EF' },
  { value: 'EG', label: 'EG' },
  { value: 'FA', label: 'FA' },
  { value: 'FB', label: 'FB' },
  { value: 'FC', label: 'FC' },
  { value: 'FD', label: 'FD' },
  { value: 'FE', label: 'FE' },
  { value: 'FF', label: 'FF' },
  { value: 'FG', label: 'FG' }
];

const shelfOptions = Array.from({ length: 6 }, (_, i) => ({
  value: (i + 1).toString(),
  label: `${i + 1}`
}));

const predefinedStores = ['supply & serve', 'APHY', 'AZTEC'];

const EditStockForm: React.FC<EditStockFormProps> = ({ 
  item, 
  onSubmit, 
  isLoading = false 
}) => {
  const { isDarkMode } = useTheme();
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const initialStoreName = item.storeName;
  const isCustomStore = initialStoreName && !predefinedStores.includes(initialStoreName);

  const [formData, setFormData] = useState<FormData>({
    name: item.name,
    quantity: item.quantity.toString(),
    price: item.price.toString(),
    supplier: item.supplier || '',
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
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validationMessage) {
      return;
    }
    
    try {
      const data: StockItem = {
        ...item,
        name: formData.name,
        quantity: Number(formData.quantity),
        price: Number(formData.price) || 0,
        supplier: formData.supplier || null,
        locationCode: formData.locationCode,
        shelfNumber: formData.shelfNumber,
        asin: formData.asin || null,
        status: formData.status,
        damagedItems: Number(formData.damagedItems),
        fulfillmentType: formData.fulfillmentType,
        storeName: formData.storeName === 'other' ? otherStoreName : formData.storeName
      };

      await onSubmit(data);
    } catch (error) {
      console.error('Error updating stock:', error);
    }
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
        
        <Input
          label="Supplier"
          name="supplier"
          value={formData.supplier}
          onChange={handleChange}
          placeholder="Enter supplier name"
          fullWidth
        />
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
        />

        <Select
          label="Fulfillment Type"
          name="fulfillmentType"
          value={formData.fulfillmentType}
          onChange={handleChange}
          options={[
            { value: 'fba', label: 'Fba' },
            { value: 'mf', label: 'Mf' }
          ]}
          fullWidth
        />

        
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              { value: 'other', label: 'Other' }
            ]}
          />
          
        </div>
        {showOtherStoreInput && (
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