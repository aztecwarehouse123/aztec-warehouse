import React, { useState, useEffect, useRef } from 'react';
import { Plus, Barcode } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { StockItem } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import BarcodeScanModal from '../modals/BarcodeScanModal';
import { generateShelfOptions } from '../../utils/shelfUtils';
import { getWarehouseLocationOptions } from '../../utils/locationUtils';
import { boxSizeSelectOptions, packingMaterialSelectOptions } from '../../utils/stockOptions';

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
  barcode?: string;
  boxSize: string;
  packingMaterial: string;
}

interface EditStockFormProps {
  item: StockItem;
  onSubmit: (data: StockItem, originalItem: StockItem) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const locationOptions = getWarehouseLocationOptions();

// Shelf options will be generated dynamically based on selected location
const generateShelfOptionsForLocation = (locationCode: string) => {
  return generateShelfOptions(locationCode);
};

  const predefinedStores = ['supply & serve', 'APHY', 'AZTEC', 'ZK', 'Fahiz'];

const supplierOptions = [
  { value: 'Rayburns Trading', label: 'RAYBURNS TRADING' },
  { value: 'Intamarque', label: 'INTAMARQUE' },
  { value: 'Sian Wholesale', label: 'SIAN WHOLESALE' },
  { value: 'DMG', label: 'DMG' },
  { value: 'CVT', label: 'CVT' },
  { value: 'Wholesale Trading Supplies', label: 'WHOLESALE TRADING SUPPLIES' },
  { value: 'HJA', label: 'HJA' },
  { value: 'Price Check', label: 'PRICE CHECK' },
  { value: 'other', label: 'OTHER' }
];

const EditStockForm: React.FC<EditStockFormProps> = ({ 
  item, 
  onSubmit, 
  // onCancel, 
  isLoading = false 
}) => {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  // Get store name based on user role for non-admin users
  const getStoreNameForUser = () => {
    switch (user?.role) {
      case 'fahiz':
        return 'fahiz';
      case 'aphy':
        return 'APHY';
      case 'supply_serve':
        return 'supply & serve';
      default:
        return item.storeName; // Keep original for admin
    }
  };

  const initialStoreName = user?.role === 'admin' ? item.storeName : getStoreNameForUser();
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
    fulfillmentType: (isCustomStore ? 'other' : (item.storeName || 'supply & serve')) === 'supply & serve' ? 'mf' : item.fulfillmentType,
    storeName: isCustomStore ? 'other' : (item.storeName || 'supply & serve'),
    barcode: item.barcode || '',
    boxSize: item.boxSize || '',
    packingMaterial: item.packingMaterial || ''
  });
  const [showOtherStoreInput, setShowOtherStoreInput] = useState(isCustomStore);
  const [otherStoreName, setOtherStoreName] = useState(isCustomStore ? initialStoreName : '');
  const [showOtherSupplierInput, setShowOtherSupplierInput] = useState(initialSupplier === 'other');
  const [otherSupplier, setOtherSupplier] = useState(initialOtherSupplier);
  const [isBarcodeScanModalOpen, setIsBarcodeScanModalOpen] = useState(false);
  
  // Ref to prevent double submissions
  const isSubmittingRef = useRef(false);

  // Ensure fulfillment type is consistent with store name
  useEffect(() => {
    if (formData.storeName === 'supply & serve' && formData.fulfillmentType !== 'mf') {
      setFormData(prev => ({ ...prev, fulfillmentType: 'mf' }));
    }
  }, [formData.storeName, formData.fulfillmentType]);

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

  const handleBarcodeScanned = (barcode: string) => {
    setFormData(prev => ({
      ...prev,
      barcode
    }));
    setIsBarcodeScanModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmittingRef.current || isLoading) {
      return;
    }
    
    if (validate()) {
      isSubmittingRef.current = true;
      try {
        const data: StockItem = {
          id: item.id,
          name: formData.name,
          quantity: parseInt(formData.quantity),
          price: (user?.role === 'admin' || user?.role === 'fahiz' || user?.role === 'aphy' || user?.role === 'supply_serve') ? parseFloat(formData.price) : item.price,
          unit: formData.unit || null,
          supplier: formData.supplier === 'other' ? otherSupplier : formData.supplier || null,
          locationCode: formData.locationCode,
          shelfNumber: formData.shelfNumber,
          asin: formData.asin || null,
          status: (user?.role === 'admin' || user?.role === 'fahiz' || user?.role === 'aphy' || user?.role === 'supply_serve') ? formData.status : 'pending',
          damagedItems: parseInt(formData.damagedItems),
          fulfillmentType: formData.fulfillmentType,
          lastUpdated: new Date(),
          storeName: formData.storeName === 'other' ? otherStoreName : formData.storeName,
          barcode: formData.barcode || null,
          boxSize: formData.boxSize || null,
          packingMaterial: formData.packingMaterial || null
        };

        await onSubmit(data, item);
      } catch (error) {
        console.error('Error updating stock:', error);
        setValidationMessage('Failed to update stock. Please try again.');
      } finally {
        isSubmittingRef.current = false;
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
    if ((user?.role === 'admin' || user?.role === 'fahiz' || user?.role === 'aphy' || user?.role === 'supply_serve') && (!formData.price || parseFloat(formData.price) < 0)) {
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
         {(user?.role === 'admin' || user?.role === 'fahiz' || user?.role === 'aphy' || user?.role === 'supply_serve') ? (
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
        
        {( user?.role === 'admin' || user?.role === 'fahiz' || user?.role === 'aphy' || user?.role === 'supply_serve') && (
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
          options={
            formData.storeName === 'supply & serve' 
              ? [{ value: 'mf', label: 'MF' }]
              : [
                  { value: 'fba', label: 'FBA' },
                  { value: 'mf', label: 'MF' }
                ]
          }
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
          options={generateShelfOptionsForLocation(formData.locationCode)}
          required
          fullWidth
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Box Size"
          name="boxSize"
          value={formData.boxSize}
          onChange={handleChange}
          options={boxSizeSelectOptions}
          fullWidth
        />
        <Select
          label="Packing Material"
          name="packingMaterial"
          value={formData.packingMaterial}
          onChange={handleChange}
          options={packingMaterialSelectOptions}
          fullWidth
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex gap-2 relative w-full">
          <Input
            label="Barcode"
            name="barcode"
            value={formData.barcode || ''}
            onChange={handleChange}
            placeholder="Enter barcode manually"
            fullWidth
            style={{ paddingRight: 44 }}
          />
          <button
            type="button"
            onClick={() => setIsBarcodeScanModalOpen(true)}
            className="absolute right-2 top-1/2 -translate-y-1 flex items-center justify-center w-8 h-8 rounded-md transition bg-transparent hover:bg-blue-50 focus:bg-blue-100 outline-none border-none p-0"
            style={{ zIndex: 2 }}
            title="Scan barcode"
            tabIndex={0}
            aria-label="Scan barcode"
          >
            <Barcode size={18} className="text-blue-500" />
          </button>
        </div>
        <Input
          label="ASIN"
          name="asin"
          value={formData.asin}
          onChange={handleChange}
          placeholder="Enter Amazon ASIN"
          fullWidth
        />
      </div>
      
      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
      </div> */}

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
        {(user?.role === 'admin' || user?.role === 'staff' || user?.role === 'manager') && (
          <div>
            <label className={`block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1`}>
              Store Name
            </label>
            <Select
              value={formData.storeName}
              onChange={(e) => {
                const value = e.target.value;
                setFormData(prev => ({ 
                  ...prev, 
                  storeName: value,
                  // Automatically set fulfillment type to 'mf' for 'supply & serve'
                  fulfillmentType: value === 'supply & serve' ? 'mf' : prev.fulfillmentType
                }));
                setShowOtherStoreInput(value === 'other');
                if (value !== 'other') {
                  setOtherStoreName('');
                }
              }}
              options={[
                { value: 'supply & serve', label: 'SUPPLY & SERVE' },
                { value: 'APHY', label: 'APHY' },
                { value: 'AZTEC', label: 'AZTEC' },
                { value: 'ZK', label: 'ZK' },
                { value: 'Fahiz', label: 'FAHIZ' },
                { value: 'other', label: 'OTHER' }
              ]}
            />
            
          </div>
        )}
       
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
      
        {(user?.role === 'admin' || user?.role === 'staff' || user?.role === 'manager') && showOtherStoreInput && !showOtherSupplierInput && (
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
        {(user?.role === 'admin' || user?.role === 'staff' || user?.role === 'manager') && showOtherStoreInput && showOtherSupplierInput && (
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
      
      <BarcodeScanModal
        isOpen={isBarcodeScanModalOpen}
        onClose={() => setIsBarcodeScanModalOpen(false)}
        onBarcodeScanned={handleBarcodeScanned}
      />
    </form>
  );
};

export default EditStockForm; 