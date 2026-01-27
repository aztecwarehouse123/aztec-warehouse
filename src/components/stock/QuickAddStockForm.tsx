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
  { value: 'Awaiting Location', label: 'Awaiting Location' },
  { value: 'Awaiting Locations Sparklin', label: 'Awaiting Locations Sparklin' },
  { value: 'Awaiting Locations Aztec', label: 'Awaiting Locations Aztec' }
];

const QuickAddStockForm: React.FC<QuickAddStockFormProps> = ({ onSubmit, onClose, isLoading = false }) => {
  // Shelf options will be generated dynamically based on selected location
  const [shelfOptions, setShelfOptions] = useState<Array<{value: string, label: string}>>([]);
  const [formData, setFormData] = useState<QuickFormData>({
    name: '',
    locationCode: 'A1',
    shelfNumber: '0',
    barcode: '',
    quantity: ''
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
       storeName: 'not set' // Default store name
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