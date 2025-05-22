import React, { useState } from 'react';
import { Plus, Barcode, CheckCircle2, XCircle } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { StockItem } from '../../types';
import BarcodeScanModal from '../modals/BarcodeScanModal';
import { useTheme } from '../../contexts/ThemeContext';

interface AddStockFormProps {
  onSubmit: (data: Omit<StockItem, 'id'>) => void;
  isLoading?: boolean;
}

interface FormData {
  name: string;
  quantity: string;
  price: string;
  supplier: string;
  locationCode: string;
  shelfNumber: string;
  barcode: string;
  threshold: string;
}

const locationOptions = [
  { value: 'AA', label: 'AA' },
  { value: 'AB', label: 'AB' },
  { value: 'AC', label: 'AC' },
  { value: 'AD', label: 'AD' },
  { value: 'BA', label: 'BA' },
  { value: 'BB', label: 'BB' },
  { value: 'BC', label: 'BC' },
  { value: 'BD', label: 'BD' },
];

const shelfOptions = Array.from({ length: 16 }, (_, i) => ({
  value: (i + 1).toString(),
  label: `${i + 1}`
}));

const AddStockForm: React.FC<AddStockFormProps> = ({ onSubmit, isLoading = false }) => {
  const { isDarkMode } = useTheme();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    quantity: '',
    price: '',
    supplier: '',
    locationCode: 'AA',
    shelfNumber: '1',
    barcode: '',
    threshold: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error on change
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
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
    if (!formData.quantity) newErrors.quantity = 'Quantity is required';
    else if (isNaN(Number(formData.quantity)) || Number(formData.quantity) < 0) {
      newErrors.quantity = 'Quantity must be a positive number';
    }
    
    if (!formData.price) newErrors.price = 'Price is required';
    else if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      newErrors.price = 'Price must be a positive number';
    }
    
    if (!formData.locationCode) newErrors.locationCode = 'Location code is required';
    if (!formData.shelfNumber) newErrors.shelfNumber = 'Shelf number is required';
    if (!formData.supplier.trim()) newErrors.supplier = 'Supplier is required';
    
    if (!formData.threshold) newErrors.threshold = 'Threshold is required';
    else if (isNaN(Number(formData.threshold)) || Number(formData.threshold) < 0) {
      newErrors.threshold = 'Threshold must be a positive number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      onSubmit({
        ...formData,
        quantity: Number(formData.quantity),
        price: Number(formData.price),
        shelfNumber: Number(formData.shelfNumber),
        threshold: Number(formData.threshold),
        lastUpdated: new Date()
      });
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-2">
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
            required
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
            error={errors.quantity}
            placeholder="Enter quantity"
            min="0"
            required
            fullWidth
          />
          
          <Input
            label="Price ($)"
            name="price"
            type="number"
            value={formData.price}
            onChange={handleChange}
            error={errors.price}
            placeholder="Enter price"
            min="0.01"
            step="0.01"
            required
            fullWidth
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Location Code"
            name="locationCode"
            value={formData.locationCode}
            onChange={handleChange}
            error={errors.locationCode}
            options={locationOptions}
            required
            fullWidth
          />
          
          <Select
            label="Shelf Number"
            name="shelfNumber"
            value={formData.shelfNumber}
            onChange={handleChange}
            error={errors.shelfNumber}
            options={shelfOptions}
            required
            fullWidth
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Threshold"
            name="threshold"
            type="number"
            value={formData.threshold}
            onChange={handleChange}
            error={errors.threshold}
            placeholder="Enter minimum stock threshold"
            min="1"
            required
            fullWidth
          />
        </div>
        
        <div className="flex items-center justify-end gap-4 pt-2">
          <div className="flex items-center gap-2">
            <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Barcode Status:</span>
            {formData.barcode ? (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle2 size={16} />
                <span className="text-sm">Scanned</span>
              </div>
            ) : (
              <div className={`flex items-center gap-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                <XCircle size={16} />
                <span className="text-sm">Not Scanned</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              type="button"
              onClick={handleScan}
              variant="secondary"
              icon={<Barcode size={18} />}
            >
              Scan Product
            </Button>
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