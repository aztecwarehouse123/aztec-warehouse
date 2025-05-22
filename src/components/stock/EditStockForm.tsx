import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { StockItem } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

interface EditStockFormProps {
  item: StockItem;
  onSubmit: (data: StockItem) => void;
  isLoading?: boolean;
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

const EditStockForm: React.FC<EditStockFormProps> = ({ item, onSubmit, isLoading = false }) => {
  const { isDarkMode } = useTheme();
  const [formData, setFormData] = useState<StockItem>(item);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormData(item);
  }, [item]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }
    if (!formData.quantity || formData.quantity < 0) {
      newErrors.quantity = 'Valid quantity is required';
    }
    if (!formData.price || formData.price <= 0) {
      newErrors.price = 'Valid price is required';
    }
    if (!formData.supplier.trim()) {
      newErrors.supplier = 'Supplier is required';
    }
    if (!formData.locationCode) {
      newErrors.locationCode = 'Location code is required';
    }
    if (!formData.shelfNumber) {
      newErrors.shelfNumber = 'Shelf number is required';
    }
    if (!formData.threshold || formData.threshold < 0) {
      newErrors.threshold = 'Valid threshold is required';
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
        threshold: Number(formData.threshold),
        lastUpdated: new Date()
      });
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
          value={formData.shelfNumber.toString()}
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
          min="0"
          required
          fullWidth
        />
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