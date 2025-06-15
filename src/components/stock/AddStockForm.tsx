import React, { useState } from 'react';
import { Plus, Barcode, CheckCircle2, Trash2 } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { StockItem } from '../../types';
import BarcodeScanModal from '../modals/BarcodeScanModal';

interface AddStockFormProps {
  onSubmit: (data: Omit<StockItem, 'id'>[]) => Promise<void>;
  isLoading?: boolean;
}

interface FormData {
  name: string;
  price: string;
  supplier: string;
  asin: string;
  status: 'pending' | 'active';
  damagedItems: string;
  barcode?: string;
  fulfillmentType: 'fba' | 'mf';
  storeName: string;
}

interface LocationEntry {
  locationCode: string;
  shelfNumber: string;
  quantity: string;
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

const AddStockForm: React.FC<AddStockFormProps> = ({ onSubmit, isLoading = false }) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    price: '',
    supplier: '',
    asin: '',
    status: 'pending',
    damagedItems: '0',
    fulfillmentType: 'fba',
    storeName: 'supply & serve'
  });

  const [locationEntries, setLocationEntries] = useState<LocationEntry[]>([
    { locationCode: 'AA', shelfNumber: '1', quantity: '' }
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [showOtherStoreInput, setShowOtherStoreInput] = useState(false);
  const [otherStoreName, setOtherStoreName] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleLocationEntryChange = (index: number, field: keyof LocationEntry, value: string) => {
    setLocationEntries(prev => {
      const newEntries = [...prev];
      newEntries[index] = { ...newEntries[index], [field]: value };
      return newEntries;
    });
  };

  const addLocationEntry = () => {
    setLocationEntries(prev => [
      ...prev,
      { locationCode: 'AA', shelfNumber: '1', quantity: '' }
    ]);
  };

  const removeLocationEntry = (index: number) => {
    setLocationEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleScan = () => {
    setIsScanModalOpen(true);
  };

  const handleBarcodeScanned = (barcode: string) => {
    setFormData(prev => ({
      ...prev,
      barcode
    }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Product name is required';

    // Validate location entries
    locationEntries.forEach((entry, index) => {
      if (!entry.quantity) {
        newErrors[`location_${index}_quantity`] = 'Quantity is required';
      } else if (isNaN(Number(entry.quantity)) || Number(entry.quantity) < 0) {
        newErrors[`location_${index}_quantity`] = 'Quantity must be a positive number';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      try {
        const stockData = locationEntries.map(entry => ({
          name: formData.name,
          quantity: parseInt(entry.quantity),
          price: parseFloat(formData.price),
          supplier: formData.supplier || null,
          locationCode: entry.locationCode,
          shelfNumber: entry.shelfNumber,
          asin: formData.asin || null,
          status: formData.status as 'pending' | 'active',
          damagedItems: parseInt(formData.damagedItems),
          barcode: formData.barcode || null,
          fulfillmentType: formData.fulfillmentType,
          lastUpdated: new Date(),
          storeName: formData.storeName === 'other' ? otherStoreName : formData.storeName
        }));

        await onSubmit(stockData);
      } catch (error) {
        console.error('Error adding stock:', error);
      }
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Product Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            placeholder="Enter product name"
            required
            fullWidth
          />
          
          <Input
            label="Supplier"
            name="supplier"
            value={formData.supplier}
            onChange={handleChange}
            error={errors.supplier}
            placeholder="Enter supplier name"
            fullWidth
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Location Entries</h3>
            <Button
              type="button"
              onClick={addLocationEntry}
              variant="outline"
              icon={<Plus size={18} />}
            >
              Add Location
            </Button>
          </div>

          {locationEntries.map((entry, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <Select
                label="Location Code"
                value={entry.locationCode}
                onChange={(e) => handleLocationEntryChange(index, 'locationCode', e.target.value)}
                options={locationOptions}
                required
                fullWidth
              />
              
              <Select
                label="Shelf Number"
                value={entry.shelfNumber}
                onChange={(e) => handleLocationEntryChange(index, 'shelfNumber', e.target.value)}
                options={shelfOptions}
                required
                fullWidth
              />
              
              <Input
                label="Quantity"
                type="number"
                value={entry.quantity}
                onChange={(e) => handleLocationEntryChange(index, 'quantity', e.target.value)}
                error={errors[`location_${index}_quantity`]}
                placeholder="Enter quantity"
                min="0"
                required
                fullWidth
              />

              {locationEntries.length > 1 && (
                <Button
                  type="button"
                  onClick={() => removeLocationEntry(index)}
                  variant="danger"
                  icon={<Trash2 size={18} />}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
            label="ASIN (seperated by commas, if multiple)"
            name="asin"
            value={formData.asin}
            onChange={handleChange}
            placeholder="Enter Amazon ASIN"
            fullWidth
          />
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Barcode</label>
            <div className="flex gap-2">
              <Input
                name="barcode"
                value={formData.barcode || ''}
                onChange={handleChange}
                placeholder="Enter barcode manually"
                fullWidth
              />
              <Button
                type="button"
                onClick={handleScan}
                variant="secondary"
                icon={<Barcode size={18} />}
                className="whitespace-nowrap"
              >
                Scan
              </Button>
            </div>
            {formData.barcode && (
              <div className="flex items-center gap-1 text-green-600 text-sm">
                <CheckCircle2 size={16} />
                <span>Barcode entered</span>
              </div>
            )}
          </div>
        
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
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
              <label className="block text-sm font-medium text-slate-700 mb-1">
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
        
        <div className="flex items-center justify-end gap-4 pt-2">
          <div className="flex gap-2">
            <Button 
              type="submit" 
              isLoading={isLoading}
              icon={<Plus size={18} />}
            >
              Add Product
            </Button>
          </div>
        </div>
      </form>

      <BarcodeScanModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onBarcodeScanned={handleBarcodeScanned}
      />
    </>
  );
};

export default AddStockForm;