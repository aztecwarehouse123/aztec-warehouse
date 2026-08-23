import React, { useState, useRef, useEffect } from 'react';
import { Plus, Barcode } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { StockItem } from '../../types';
import BarcodeScanModal from '../modals/BarcodeScanModal';

import { db } from '../../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { generateShelfOptions } from '../../utils/shelfUtils';
import { getWarehouseLocationOptions } from '../../utils/locationUtils';
import { boxSizeSelectOptions, packingMaterialSelectOptions } from '../../utils/stockOptions';

interface QuickAddStockFormProps {
  onSubmit: (data: Omit<StockItem, 'id'>[]) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
  existingStockItems?: StockItem[];
}

interface QuickFormData {
  name: string;
  locationCode: string;
  shelfNumber: string;
  barcode: string;
  quantity: string;
  boxSize: string;
  packingMaterial: string;
}

const locationOptions = getWarehouseLocationOptions();

const QuickAddStockForm: React.FC<QuickAddStockFormProps> = ({ onSubmit, onClose, isLoading = false }) => {
  // Shelf options will be generated dynamically based on selected location
  const [shelfOptions, setShelfOptions] = useState<Array<{value: string, label: string}>>([]);
  const [formData, setFormData] = useState<QuickFormData>({
    name: '',
    locationCode: 'A1',
    shelfNumber: '0',
    barcode: '',
    quantity: '',
    boxSize: '',
    packingMaterial: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [barcodeSearchMessage, setBarcodeSearchMessage] = useState<string | null>(null);
  const [isFetchingProductInfo, setIsFetchingProductInfo] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Ref to prevent double submissions
  const isSubmittingRef = useRef(false);

  // Initialize shelf options for the default location
  useEffect(() => {
    setShelfOptions(generateShelfOptions(formData.locationCode));
  }, []);

  // Update shelf options when location changes
  useEffect(() => {
    setShelfOptions(generateShelfOptions(formData.locationCode));
    // Reset shelf number if it's no longer valid for the new location
    const maxShelf = generateShelfOptions(formData.locationCode).length - 1;
    if (parseInt(formData.shelfNumber) > maxShelf) {
      setFormData(prev => ({ ...prev, shelfNumber: '0' }));
    }
  }, [formData.locationCode]);

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

    // Auto-search when barcode is manually entered and is 13 digits
    if (name === 'barcode' && value.length === 13 && !isFetchingProductInfo) {
      // Clear any existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
             // Add a small delay to avoid searching while user is still typing
       searchTimeoutRef.current = setTimeout(() => {
         // Use the current value directly since we know it's 13 digits
         if (value.length === 13) {
           fetchBarcodeInfo(value);
         }
       }, 500);
    } else if (name === 'barcode' && value.length !== 13) {
      // Clear timeout if barcode is not 13 digits
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    }
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
    setFetchError(null);
    setIsFetchingProductInfo(true);
    
    let searchSuccessful = false;
    
    try {
      // First, try to fetch from scannedProducts collection
      const q = query(collection(db, 'scannedProducts'), where('barcode', '==', barcode));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        setFormData(prev => ({
          ...prev,
          name: docData.name || prev.name
        }));
        setBarcodeSearchMessage('Product name auto-filled from scanned products.');
        searchSuccessful = true;
      } else {
        // Try external API
        const proxy = 'https://corsproxy.io/?';
        const url = `${proxy}https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data && data.items && data.items.length > 0) {
          const item = data.items[0];
          setFormData(prev => ({
            ...prev,
            name: item.title || prev.name
          }));
          setBarcodeSearchMessage('Product name auto-filled from external database.');
          searchSuccessful = true;
        } else {
          //setFetchError('No product info found for this barcode.');
          setBarcodeSearchMessage('No product found for this barcode. Please enter details manually.');
        }
      }
    } catch {
      setFetchError('Failed to fetch product info.');
      setBarcodeSearchMessage('Failed to search for product. Please enter details manually.');
    } finally {
      setIsFetchingProductInfo(false);
      
      // Fallback: If search was not successful and barcode is 13 digits, trigger the 13-digit logic
      if (!searchSuccessful && barcode.length === 13) {
        // Add a small delay to ensure the form state is updated
        setTimeout(() => {
          fetchBarcodeInfo(barcode);
        }, 100);
      }
    }
  };

  const fetchBarcodeInfo = async (barcodeToSearch?: string) => {
    const barcode = barcodeToSearch || formData.barcode;
    if (!barcode || isFetchingProductInfo) return;
    setFetchError(null);
    setIsFetchingProductInfo(true);
    try {
      // First, try to fetch from scannedProducts collection (like scan button)
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
        // Try external API
        const proxy = 'https://corsproxy.io/?';
        const url = `${proxy}https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data && data.items && data.items.length > 0) {
          const item = data.items[0];
          setFormData(prev => ({
            ...prev,
            name: item.title || prev.name
          }));
          setBarcodeSearchMessage('Product name auto-filled from external database.');
        } else {
          setFetchError('No product info found for this barcode.');
        }
      }
    } catch {
      setFetchError('Failed to fetch product info.');
    } finally {
      setIsFetchingProductInfo(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.locationCode) {
      newErrors.locationCode = 'Location is required';
    }

    if (!formData.shelfNumber) {
      newErrors.shelfNumber = 'Shelf number is required';
    }

    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmittingRef.current || isLoading) {
      return;
    }
    
    if (!validate()) {
      return;
    }

         // Create stock item with default values for non-essential fields
     const stockItem: Omit<StockItem, 'id'> = {
       name: formData.name.toUpperCase(), // Convert to uppercase like in Add page
       quantity: parseInt(formData.quantity),
       price: 0, // Default price
       unit: null, // Default unit
       supplier: 'not set', // Default supplier
       lastUpdated: new Date(),
       locationCode: formData.locationCode,
       shelfNumber: formData.shelfNumber,
       barcode: formData.barcode || null,
       asin: null, // Default ASIN
       status: 'pending', // Default status
       damagedItems: 0, // Default damaged items
       fulfillmentType: 'fba', // Default fulfillment type
       storeName: 'not set', // Default store name
       boxSize: formData.boxSize || null,
       packingMaterial: formData.packingMaterial || null
     };

    isSubmittingRef.current = true;
    try {
      await onSubmit([stockItem]);
      onClose(); // Close modal after successful submission
    } catch (error) {
      console.error('Error adding stock:', error);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Product Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Enter product name"
          error={errors.name}
          required
          fullWidth
        />

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
          <Select
            label="Location Code"
            name="locationCode"
            value={formData.locationCode}
            onChange={handleChange}
            options={locationOptions}
            error={errors.locationCode}
            required
            fullWidth
          />
          
          <Select
            label="Shelf Number"
            name="shelfNumber"
            value={formData.shelfNumber}
            onChange={handleChange}
            options={shelfOptions}
            error={errors.shelfNumber}
            required
            fullWidth
          />
        </div>

                 <div className="space-y-2">
           <div className="flex gap-2 relative w-full">
             <Input
               label="Barcode"
               name="barcode"
               value={formData.barcode}
               onChange={handleChange}
               placeholder="Enter barcode"
               fullWidth
               style={{ paddingRight: 44 }}
             />
             <button
               type="button"
               onClick={async () => {
                 if (formData.barcode.trim() && !isFetchingProductInfo) {
                   setFetchError(null);
                   setIsFetchingProductInfo(true);
                   try {
                     await fetchBarcodeInfo();
                   } finally {
                     setIsFetchingProductInfo(false);
                   }
                 }
               }}
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
           {isFetchingProductInfo && (
             <div className="flex items-center gap-2 text-blue-500 text-sm">
               <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
               Fetching product info...
             </div>
           )}
         </div>

        <Input
          label="Quantity"
          name="quantity"
          type="number"
          value={formData.quantity}
          onChange={handleChange}
          placeholder="Enter quantity"
          error={errors.quantity}
          min="1"
          required
          fullWidth
        />

        <div className="flex items-center justify-end gap-4 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button 
              type="submit" 
              isLoading={isLoading}
              icon={<Plus size={18} />}
            >
              Quick Add
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
    </>
  );
};

export default QuickAddStockForm; 