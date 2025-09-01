import React, { useState, useEffect } from 'react';
import { Plus, Barcode, Trash2, CheckCircle } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { StockItem } from '../../types';
import BarcodeScanModal from '../modals/BarcodeScanModal';
import AddProductModal from '../modals/AddProductModal';
import LocationReminderModal from '../modals/LocationReminderModal';

import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import ConfirmationModal from '../modals/ConfirmationModal';
import Modal from '../modals/Modal';
import { generateShelfOptions } from '../../utils/shelfUtils';


interface AddStockFormProps {
  onSubmit: (data: Omit<StockItem, 'id'>[]) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  existingStockItems: StockItem[];
  isSupplyServe?: boolean;
}

interface FormData {
  name: string;
  price: string;
  unit: string;
  supplier: string;
  asin: string;
  status: 'pending' | 'active';
  damagedItems: string;
  barcode?: string;
  fulfillmentType: 'fba' | 'mf';
  storeName: string;
  selectedAsins: string[]; // Add this new field for multiple ASINs
}

interface LocationEntry {
  locationCode: string;
  shelfNumber: string;
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
  { value: 'Awaiting Location', label: 'Awaiting Location' }
];

// Shelf options will be generated dynamically based on selected location
const generateShelfOptionsForLocation = (locationCode: string) => {
  return generateShelfOptions(locationCode);
};

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

const AddStockForm: React.FC<AddStockFormProps> = ({ onSubmit, isLoading = false, existingStockItems, isSupplyServe = false }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    price: '',
    unit: '',
    supplier: supplierOptions[0].value, // Default to first supplier
    asin: '',
    status: 'pending',
    damagedItems: '0',
    fulfillmentType: 'mf', // Default to MF since default store is 'supply & serve'
    storeName: 'supply & serve', // Default to first store
    selectedAsins: [] // Initialize empty array for multiple ASINs
  });

  const [locationEntries, setLocationEntries] = useState<LocationEntry[]>([
    { locationCode: 'A1', shelfNumber: '0', quantity: '' }
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
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [searchTimeoutRef, setSearchTimeoutRef] = useState<NodeJS.Timeout | null>(null);
  const [multipleAsins, setMultipleAsins] = useState<string[]>([]);
  const [isAsinSelectionModalOpen, setIsAsinSelectionModalOpen] = useState(false);
  const [pendingAsinData, setPendingAsinData] = useState<{ name: string; unit: string; asin: string } | null>(null);
  const [selectedMultipleAsins, setSelectedMultipleAsins] = useState<string[]>([]); // Add state for selected multiple ASINs
  
  // Location reminder modal state
  const [isLocationReminderModalOpen, setIsLocationReminderModalOpen] = useState(false);
  const [locationReminderData, setLocationReminderData] = useState<{
    hiddenProduct: StockItem;
    newProductName: string;
  } | null>(null);

  // Ensure fulfillment type is consistent with store name
  useEffect(() => {
    if (formData.storeName === 'supply & serve' && formData.fulfillmentType !== 'mf') {
      setFormData(prev => ({ ...prev, fulfillmentType: 'mf' }));
    }
  }, [formData.storeName, formData.fulfillmentType]);

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

    // Auto-search when barcode is manually entered and is 13 digits
    if (name === 'barcode' && value.length === 13 && !isFetchingProductInfo) {
      // Clear any existing timeout
      if (searchTimeoutRef) {
        clearTimeout(searchTimeoutRef);
      }
      
      // Add a small delay to avoid searching while user is still typing
      const timeoutId = setTimeout(() => {
        // Use the current value directly since we know it's 13 digits
        if (value.length === 13) {
          fetchBarcodeInfo(value);
        }
      }, 500);
      setSearchTimeoutRef(timeoutId);
    } else if (name === 'barcode' && value.length !== 13) {
      // Clear timeout if barcode is not 13 digits
      if (searchTimeoutRef) {
        clearTimeout(searchTimeoutRef);
        setSearchTimeoutRef(null);
      }
    }
  };

  const handleLocationEntryChange = (index: number, field: keyof LocationEntry, value: string) => {
    setLocationEntries(prev => {
      const newEntries = [...prev];
      newEntries[index] = { ...newEntries[index], [field]: value };
      
      // If location code changed, reset shelf number to 0 and validate
      if (field === 'locationCode') {
        newEntries[index].shelfNumber = '0';
      }
      
      // If shelf number changed, validate it's within range for the location
      if (field === 'shelfNumber') {
        const locationCode = newEntries[index].locationCode;
        const maxShelf = generateShelfOptions(locationCode).length - 1;
        const shelfNum = parseInt(value);
        if (shelfNum > maxShelf) {
          newEntries[index].shelfNumber = '0';
        }
      }
      
      return newEntries;
    });
  };

  const addLocationEntry = () => {
    setLocationEntries(prev => [
      ...prev,
      { locationCode: 'A1', shelfNumber: '0', quantity: '' }
    ]);
  };

  const removeLocationEntry = (index: number) => {
    setLocationEntries(prev => prev.filter((_, i) => i !== index));
  };

  // const handleScan = () => {
  //   setIsScanModalOpen(true);
  // };

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
        const asinValue = docData.asin || '';
        
        // Check if ASIN contains multiple values (space-separated)
        if (asinValue && asinValue.includes(' ')) {
          const asinArray = asinValue.split(' ').filter((asin: string) => asin.trim());
          if (asinArray.length > 1) {
            setMultipleAsins(asinArray);
            setSelectedMultipleAsins([]); // Reset selected ASINs
            setPendingAsinData({
              name: docData.name || '',
              unit: docData.unit || '',
              asin: asinArray[0] // Set first ASIN as default
            });
            setIsAsinSelectionModalOpen(true);
            setBarcodeSearchMessage('Multiple ASINs detected. Please select one or more.');
            searchSuccessful = true;
            return;
          }
        }
        
        setFormData(prev => ({
          ...prev,
          name: docData.name || prev.name,
          unit: docData.unit || prev.unit,
          asin: asinValue || prev.asin,
          selectedAsins: asinValue ? [asinValue] : []
        }));
        setBarcodeSearchMessage('Product name, unit, and ASIN auto-filled from scanned products.');
        searchSuccessful = true;
      } else {
        // Try external API
        const proxy = 'https://corsproxy.io/?';
        const url = `${proxy}https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data && data.items && data.items.length > 0) {
          const item = data.items[0];
          const asinValue = item.asin || item.amazon_asin || '';
          
          // Check if ASIN contains multiple values (space-separated)
          if (asinValue && asinValue.includes(' ')) {
            const asinArray = asinValue.split(' ').filter((asin: string) => asin.trim());
            if (asinArray.length > 1) {
              setMultipleAsins(asinArray);
              setSelectedMultipleAsins([]); // Reset selected ASINs
              setPendingAsinData({
                name: item.title || '',
                unit: '',
                asin: asinArray[0] // Set first ASIN as default
            });
              setIsAsinSelectionModalOpen(true);
              setBarcodeSearchMessage('Multiple ASINs detected. Please select one or more.');
              searchSuccessful = true;
              return;
            }
          }
          
          setFormData(prev => ({
            ...prev,
            name: item.title || prev.name,
            asin: asinValue || prev.asin,
            selectedAsins: asinValue ? [asinValue] : []
          }));
          setBarcodeSearchMessage('Product name and ASIN auto-filled from external database.');
          searchSuccessful = true;
        } else {
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

  // Check for hidden products with the same barcode
  const checkForHiddenProducts = async (barcode: string) => {
    try {
      const q = query(collection(db, 'inventory'), where('barcode', '==', barcode), where('quantity', '==', 0));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const hiddenProduct = snapshot.docs[0].data() as StockItem;
        setLocationReminderData({
          hiddenProduct: {
            ...hiddenProduct,
            id: snapshot.docs[0].id,
            lastUpdated: hiddenProduct.lastUpdated instanceof Date ? hiddenProduct.lastUpdated : new Date(hiddenProduct.lastUpdated)
          },
          newProductName: formData.name || 'New Product'
        });
        setIsLocationReminderModalOpen(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking for hidden products:', error);
      return false;
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
        const asinValue = docData.asin || '';
        
        // Check if ASIN contains multiple values (space-separated)
        if (asinValue && asinValue.includes(' ')) {
          const asinArray = asinValue.split(' ').filter((asin: string) => asin.trim());
          if (asinArray.length > 1) {
            setMultipleAsins(asinArray);
            setSelectedMultipleAsins([]); // Reset selected ASINs
            setPendingAsinData({
              name: docData.name || '',
              unit: docData.unit || '',
              asin: asinArray[0] // Set first ASIN as default
            });
            setIsAsinSelectionModalOpen(true);
            setBarcodeSearchMessage('Multiple ASINs detected. Please select one or more.');
            setIsFetchingProductInfo(false);
            return;
          }
        }
        
        setFormData(prev => ({
          ...prev,
          name: docData.name || prev.name,
          unit: docData.unit || prev.unit,
          asin: asinValue || prev.asin,
          selectedAsins: asinValue ? [asinValue] : []
        }));
        setBarcodeSearchMessage('Product name, unit, and ASIN auto-filled from scanned products.');
        setIsFetchingProductInfo(false);
        return;
      }
      // If not found, try UPC API
      const proxy = 'https://corsproxy.io/?';
      const url = `${proxy}https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data && data.items && data.items.length > 0) {
        const item = data.items[0];
        const asinValue = item.asin || item.amazon_asin || '';
        
        // Check if ASIN contains multiple values (space-separated)
        if (asinValue && asinValue.includes(' ')) {
          const asinArray = asinValue.split(' ').filter((asin: string) => asin.trim());
          if (asinArray.length > 1) {
            setMultipleAsins(asinArray);
            setSelectedMultipleAsins([]); // Reset selected ASINs
            setPendingAsinData({
              name: item.title || '',
              unit: '',
              asin: asinArray[0] // Set first ASIN as default
            });
            setIsAsinSelectionModalOpen(true);
            setBarcodeSearchMessage('Multiple ASINs detected. Please select one or more.');
            setIsFetchingProductInfo(false);
            return;
          }
        }
        
        setFormData(prev => ({
          ...prev,
          name: item.title || prev.name,
          asin: asinValue || prev.asin,
          selectedAsins: asinValue ? [asinValue] : []
        }));
        setBarcodeSearchMessage('Product name and ASIN auto-filled from UPC database.');
      } else {
        setFetchError('No product info found for this barcode.');
      }
    } catch {
      setFetchError('Failed to fetch product info.');
    } finally {
      setIsFetchingProductInfo(false);
      
      // After processing product info, check for hidden products with the same barcode
      await checkForHiddenProducts(barcode);
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
      // Ensure supplier and storeName are set to first option if not selected
      const supplier = formData.supplier || supplierOptions[0].value;
      const storeName = formData.storeName || 'supply & serve';
      
      // Use selected ASINs if available, otherwise fall back to single ASIN
      const asinsToUse = formData.selectedAsins.length > 0 ? formData.selectedAsins : (formData.asin ? [formData.asin] : []);
      
      const stockData = locationEntries.map(entry => ({
        name: formData.name,
        quantity: parseInt(entry.quantity),
        price: user?.role === 'admin' ? parseFloat(formData.price) : 0,
        unit: formData.unit || null,
        supplier: supplier === 'other' ? otherSupplier : supplier,
        locationCode: entry.locationCode,
        shelfNumber: entry.shelfNumber,
        asin: asinsToUse.length > 0 ? asinsToUse.join(', ') : null, // Join multiple ASINs with commas
        status: formData.status as 'pending' | 'active',
        damagedItems: parseInt(formData.damagedItems),
        barcode: formData.barcode || null,
        fulfillmentType: formData.fulfillmentType,
        lastUpdated: new Date(),
        storeName: storeName === 'other' ? otherStoreName : storeName
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

  const handleAddProduct = () => {
    setIsAddProductModalOpen(true);
  };

  const handleProductAdded = () => {
    // Show success message
    setSuccessMessage('Product has been successfully added to the database!');
    setIsSuccessModalOpen(true);
  };

  const handleAsinSelection = (selectedAsins: string[]) => {
    if (pendingAsinData) {
      setFormData(prev => ({
        ...prev,
        name: pendingAsinData.name || prev.name,
        unit: pendingAsinData.unit || prev.unit,
        asin: selectedAsins.join(', '), // Join multiple ASINs for display
        selectedAsins: selectedAsins // Store the array of selected ASINs
      }));
      setBarcodeSearchMessage(`Product info and ${selectedAsins.length} selected ASIN(s) auto-filled.`);
    }
    setIsAsinSelectionModalOpen(false);
    setMultipleAsins([]);
    setPendingAsinData(null);
    setSelectedMultipleAsins([]);
  };

  const handleCancelAsinSelection = () => {
    setIsAsinSelectionModalOpen(false);
    setMultipleAsins([]);
    setPendingAsinData(null);
    setSelectedMultipleAsins([]);
    setBarcodeSearchMessage('ASIN selection cancelled. Please enter details manually.');
  };

  const handleAsinToggle = (asin: string) => {
    setSelectedMultipleAsins(prev => {
      const newSelection = prev.includes(asin) 
        ? prev.filter(a => a !== asin)
        : [...prev, asin];
      return newSelection;
    });
  };

  // Handle location reminder modal actions
  const handleUseLocation = (locationCode: string, shelfNumber: string) => {
    if (locationEntries.length > 0) {
      setLocationEntries(prev => {
        const newEntries = [...prev];
        newEntries[0] = { ...newEntries[0], locationCode, shelfNumber };
        return newEntries;
      });
    }
    setIsLocationReminderModalOpen(false);
    setLocationReminderData(null);
  };

  const handleManualLocation = () => {
    setIsLocationReminderModalOpen(false);
    setLocationReminderData(null);
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
          {!showOtherSupplierInput && (<Input
            label="Unit (Optional)"
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            placeholder="e.g. ML, GM, PC, etc."
            fullWidth
          />)}
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
            {showOtherSupplierInput && (<Input
            label="Unit (Optional)"
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            placeholder="e.g. ML, GM, PC, etc."
            fullWidth
          />)}
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
                options={generateShelfOptionsForLocation(entry.locationCode)}
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
                onClick={() => fetchBarcodeInfo()}
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
          <Input
            label="ASIN (separated by commas, if multiple)"
            name="asin"
            value={formData.asin}
            onChange={handleChange}
            placeholder="Enter Amazon ASIN"
            fullWidth
          />
          
            {fetchError && (
              <div className="text-red-500 text-sm">{fetchError} Please enter details manually.</div>
            )}
            {barcodeSearchMessage && (
              <div className="flex items-center text-xs mt-1 text-green-600 dark:text-green-400 pl-1">{barcodeSearchMessage}</div>
            )}
            
        </div>

        {!isSupplyServe && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Select
              label="Store Name"
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
                  { value: 'supply & serve', label: 'Supply & Serve' },
                  { value: 'APHY', label: 'APHY' },
                  { value: 'AZTEC', label: 'AZTEC' },
                  { value: 'ZK', label: 'ZK' },
                  { value: 'Fahiz', label: 'Fahiz' },
                  { value: 'other', label: 'Other' }
                ]}
              />
            </div>
          </div>
        )}

        {showOtherStoreInput && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        )}
        
        <div className="flex items-center justify-end gap-4 pt-2">
          <div className="flex gap-2">
            
            <Button
              type="button"
              onClick={handleAddProduct}
              variant="primary"
              icon={<Plus size={18} />}
            >
              Add New Product
            </Button>
            <Button 
              type="submit" 
              isLoading={isLoading}
              variant="success"
              icon={<Plus size={18} />}
            >
              Confirm
            </Button>
            {/* <Button
                type="button"
                onClick={handleScan}
                variant="primary"
                icon={<Barcode size={18} />}
                className="whitespace-nowrap"
              >
                Scan
              </Button> */}
          </div>
        </div>
      </form>

      <BarcodeScanModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onBarcodeScanned={handleBarcodeScanned}
      />

      <AddProductModal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        onSuccess={handleProductAdded}
      />

      <ConfirmationModal
        isOpen={isDuplicateModalOpen}
        onClose={handleCancelDuplicate}
        onConfirm={handleConfirmDuplicate}
        title="Duplicate Stock Detected"
        message={duplicateInfo ? `A product with the same name and barcode already exists at location ${duplicateInfo.location}. Do you want to add stock anyway?` : ''}
        isLoading={isLoading}
        confirmLabel="Yes"
        cancelLabel="No"
      />

      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title="Success!"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-green-600">
            <CheckCircle size={24} />
            <p className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>{successMessage}</p>
          </div>
          <div className="flex justify-end pt-4">
            <Button
              variant="primary"
              onClick={() => setIsSuccessModalOpen(false)}
            >
              OK
            </Button>
          </div>
        </div>
      </Modal>

      {/* ASIN Selection Modal */}
      <Modal
        isOpen={isAsinSelectionModalOpen}
        onClose={handleCancelAsinSelection}
        title="Multiple ASINs Detected"
        size="md"
      >
        <div className="space-y-4">
          <p className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>
            Multiple ASINs were found for this product. Please select one or more:
          </p>
          
          <div className="space-y-3">
            {multipleAsins.map((asin, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedMultipleAsins.includes(asin)
                    ? isDarkMode 
                      ? 'border-blue-400 bg-blue-900/20' 
                      : 'border-blue-400 bg-blue-50'
                    : isDarkMode 
                      ? 'border-slate-600 hover:border-blue-400 hover:bg-slate-700' 
                      : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
                onClick={() => handleAsinToggle(asin)}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-mono text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    {asin}
                  </span>
                  <div className="flex items-center gap-2">
                    {selectedMultipleAsins.includes(asin) && (
                      <CheckCircle size={16} className="text-blue-500" />
                    )}
                    <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      ASIN {index + 1}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-4">
            <div className="text-sm text-slate-500">
              {selectedMultipleAsins.length > 0 
                ? `${selectedMultipleAsins.length} ASIN(s) selected`
                : 'No ASINs selected'
              }
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleCancelAsinSelection}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleAsinSelection(selectedMultipleAsins)}
                disabled={selectedMultipleAsins.length === 0}
              >
                Confirm Selection
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Location Reminder Modal */}
      {locationReminderData?.hiddenProduct && (
        <LocationReminderModal
          isOpen={isLocationReminderModalOpen}
          onClose={() => setIsLocationReminderModalOpen(false)}
          onUseLocation={handleUseLocation}
          onManualLocation={handleManualLocation}
          hiddenProduct={locationReminderData.hiddenProduct}
          newProductName={locationReminderData.newProductName || 'New Product'}
        />
      )}
    </>
  );
};

export default AddStockForm;