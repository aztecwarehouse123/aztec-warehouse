import React, { useState } from 'react';
import { Plus, Barcode, Trash2 } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { StockItem } from '../../types';
import BarcodeScanModal from '../modals/BarcodeScanModal';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import DeleteConfirmationModal from '../modals/DeleteConfirmationModal';


interface AddStockFormProps {
  onSubmit: (data: Omit<StockItem, 'id'>[]) => Promise<void>;
  isLoading?: boolean;
  existingStockItems: StockItem[];
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
  value: i.toString(),
  label: `${i}`
}));

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

const AddStockForm: React.FC<AddStockFormProps> = ({ onSubmit, isLoading = false, existingStockItems }) => {
  const { user } = useAuth();
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
    { locationCode: 'AA', shelfNumber: '0', quantity: '' }
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [showOtherStoreInput, setShowOtherStoreInput] = useState(false);
  const [otherStoreName, setOtherStoreName] = useState('');
  const { isDarkMode } = useTheme();
  const [barcodeSearchMessage, setBarcodeSearchMessage] = useState<string | null>(null);
  const [isFetchingProductInfo, setIsFetchingProductInfo] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showOtherSupplierInput, setShowOtherSupplierInput] = useState(false);
  const [otherSupplier, setOtherSupplier] = useState('');
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [pendingStockData, setPendingStockData] = useState<Omit<StockItem, 'id'>[] | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<{name: string, location: string} | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'supplier') {
      setShowOtherSupplierInput(value === 'other');
      if (value !== 'other') setOtherSupplier('');
    }
    
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
      { locationCode: 'AA', shelfNumber: '0', quantity: '' }
    ]);
  };

  const removeLocationEntry = (index: number) => {
    setLocationEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleScan = () => {
    setIsScanModalOpen(true);
  };

  const handleBarcodeScanned = async (barcode: string) => {
    setFormData(prev => ({
      ...prev,
      barcode
    }));
    setBarcodeSearchMessage(null);
    try {
      const q = query(collection(db, 'scannedProducts'), where('barcode', '==', barcode));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        setFormData(prev => ({
          ...prev,
          name: docData.name || prev.name
        }));
        setBarcodeSearchMessage('Product name auto-filled from scanned products.');
      } else {
        setBarcodeSearchMessage('No product found for this barcode. Please enter details manually.');
      }
    } catch {
      setBarcodeSearchMessage('Failed to search for product. Please enter details manually.');
    }
  };

  const fetchBarcodeInfo = async () => {
    if (!formData.barcode || isFetchingProductInfo) return;
    setFetchError(null);
    setIsFetchingProductInfo(true);
    try {
      // First, try to fetch from scannedProducts collection (like scan button)
      const q = query(collection(db, 'scannedProducts'), where('barcode', '==', formData.barcode));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        setFormData(prev => ({
          ...prev,
          name: docData.name || prev.name
        }));
        setBarcodeSearchMessage('Product name auto-filled from scanned products.');
        setIsFetchingProductInfo(false);
        return;
      }
      // If not found, try UPC API
      const proxy = 'https://corsproxy.io/?';
      const url = `${proxy}https://api.upcitemdb.com/prod/trial/lookup?upc=${formData.barcode}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data && data.items && data.items.length > 0) {
        const item = data.items[0];
        setFormData(prev => ({
          ...prev,
          name: item.title || prev.name
        }));
        setBarcodeSearchMessage('Product name auto-filled from UPC database.');
      } else {
        setFetchError('No product info found for this barcode.');
      }
    } catch {
      setFetchError('Failed to fetch product info.');
    } finally {
      setIsFetchingProductInfo(false);
    }
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
      const stockData = locationEntries.map(entry => ({
        name: formData.name,
        quantity: parseInt(entry.quantity),
        price: user?.role === 'admin' ? parseFloat(formData.price) : 0,
        supplier: formData.supplier === 'other' ? otherSupplier : formData.supplier || null,
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
      // Check for duplicate (same name, barcode, and location)
      const duplicate = stockData.find(newItem =>
        existingStockItems.some(existing =>
          existing.name.trim().toLowerCase() === newItem.name.trim().toLowerCase() &&
          (existing.barcode || '') === (newItem.barcode || '') &&
          existing.locationCode === newItem.locationCode &&
          existing.shelfNumber === newItem.shelfNumber
        )
      );
      if (duplicate) {
        setDuplicateInfo({
          name: duplicate.name,
          location: `${duplicate.locationCode}-${duplicate.shelfNumber}`
        });
        setPendingStockData(stockData);
        setIsDuplicateModalOpen(true);
        return;
      }
      try {
        await onSubmit(stockData);
      } catch (error) {
        console.error('Error adding stock:', error);
      }
    }
  };

  const handleConfirmDuplicate = async () => {
    if (pendingStockData) {
      try {
        await onSubmit(pendingStockData);
      } catch (error) {
        console.error('Error adding stock:', error);
      }
      setIsDuplicateModalOpen(false);
      setPendingStockData(null);
      setDuplicateInfo(null);
    }
  };

  const handleCancelDuplicate = () => {
    setIsDuplicateModalOpen(false);
    setPendingStockData(null);
    setDuplicateInfo(null);
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
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Location Entries</h3>
            <Button
              type="button"
              onClick={addLocationEntry}
              variant="primary"
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
            label="ASIN (seperated by commas, if multiple)"
            name="asin"
            value={formData.asin}
            onChange={handleChange}
            placeholder="Enter Amazon ASIN"
            fullWidth
          />
          <div className="space-y-2">
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
                onClick={fetchBarcodeInfo}
                className="absolute right-2 top-1/2 -translate-y-1 flex items-center justify-center w-8 h-8 rounded-md transition bg-transparent hover:bg-blue-50 focus:bg-blue-100 outline-none border-none p-0"
                style={{ zIndex: 2 }}
                title="Fetch product info by barcode"
                tabIndex={0}
                aria-label="Fetch product info by barcode"
                disabled={isFetchingProductInfo}
              >
                {isFetchingProductInfo ? <svg className="animate-spin text-blue-500" width="18" height="18" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <Barcode size={18} className="text-blue-500" />}
              </button>
            </div>
            {fetchError && (
              <div className="text-red-500 text-sm">{fetchError} Please enter details manually.</div>
            )}
            {barcodeSearchMessage && (
              <div className="flex items-center text-xs mt-1 text-green-600 dark:text-green-400 pl-1">{barcodeSearchMessage}</div>
            )}
          </div>
        
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Select
            label="Store Name"
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
          {showOtherStoreInput && (
            <div>
              <label className={`block text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'} mb-1`}>
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
            <Button
                type="button"
                onClick={handleScan}
                variant="primary"
                icon={<Barcode size={18} />}
                className="whitespace-nowrap"
              >
                Scan
              </Button>
          </div>
        </div>
      </form>

      <BarcodeScanModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onBarcodeScanned={handleBarcodeScanned}
      />

      <DeleteConfirmationModal
        isOpen={isDuplicateModalOpen}
        onClose={handleCancelDuplicate}
        onConfirm={handleConfirmDuplicate}
        title="Duplicate Stock Detected"
        message={duplicateInfo ? `A product with the same name and barcode already exists at location ${duplicateInfo.location}. Do you want to add stock anyway?` : ''}
        isLoading={isLoading}
      />
    </>
  );
};

export default AddStockForm;