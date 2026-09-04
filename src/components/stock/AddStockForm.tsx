import React, { useState, useEffect, useRef } from 'react';
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
import { getWarehouseLocationOptions } from '../../utils/locationUtils';
import { boxSizeSelectOptions, packingMaterialSelectOptions } from '../../utils/stockOptions';
import { storeNameSelectOptions } from '../../utils/storeOptions';


interface AddStockFormProps {
  onSubmit: (data: Omit<StockItem, 'id'>[]) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  existingStockItems: StockItem[];
  isSupplyServe?: boolean;
  onShowProductLocationInfo?: (productName: string, barcode: string) => void;
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
  boxSize: string;
  packingMaterial: string;
}

interface LocationEntry {
  locationCode: string;
  shelfNumber: string;
  quantity: string;
}

const locationOptions = getWarehouseLocationOptions();

// Shelf options will be generated dynamically based on selected location
const generateShelfOptionsForLocation = (locationCode: string) => {
  return generateShelfOptions(locationCode);
};

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

const AddStockForm: React.FC<AddStockFormProps> = ({ onSubmit, isLoading = false, existingStockItems, isSupplyServe = false, onShowProductLocationInfo }) => {
  const { user } = useAuth();
  
  // Get store name based on user role
  const getStoreNameForUser = () => {
    switch (user?.role) {
      case 'fahiz':
        return 'fahiz';
      case 'aphy':
        return 'APHY';
      case 'supply_serve':
        return 'supply & serve';
      default:
        return 'supply & serve';
    }
  };

  const [formData, setFormData] = useState<FormData>({
    name: '',
    price: '',
    unit: '',
    supplier: supplierOptions[0].value, // Default to first supplier
    asin: '',
    status: 'pending',
    damagedItems: '0',
    fulfillmentType: 'mf', // Default to MF since default store is 'supply & serve'
    storeName: getStoreNameForUser(), // Set based on user role
    selectedAsins: [], // Initialize empty array for multiple ASINs
    boxSize: '',
    packingMaterial: ''
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
  const [pendingAsinData, setPendingAsinData] = useState<{ name: string; unit: string; asin: string; boxSize: string; packingMaterial: string } | null>(null);
  const [selectedMultipleAsins, setSelectedMultipleAsins] = useState<string[]>([]); // Add state for selected multiple ASINs
  
  // Location reminder modal state
  const [isLocationReminderModalOpen, setIsLocationReminderModalOpen] = useState(false);
  const [locationReminderData, setLocationReminderData] = useState<{
    hiddenProduct: StockItem;
    newProductName: string;
  } | null>(null);

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
              asin: asinArray[0], // Set first ASIN as default
              boxSize: docData.boxSize ? String(docData.boxSize) : '',
              packingMaterial: docData.packingMaterial ? String(docData.packingMaterial) : '',
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
          selectedAsins: asinValue ? [asinValue] : [],
          boxSize: docData.boxSize ? String(docData.boxSize) : prev.boxSize,
          packingMaterial: docData.packingMaterial ? String(docData.packingMaterial) : prev.packingMaterial,
        }));
        setBarcodeSearchMessage('Product name, unit, and ASIN auto-filled from scanned products.');
        
        // Show existing product locations if available
        if (onShowProductLocationInfo && docData.name) {
          onShowProductLocationInfo(docData.name, barcode);
        }
        
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
                asin: asinArray[0], // Set first ASIN as default
                boxSize: '',
                packingMaterial: '',
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
          
          // Show existing product locations if available
          if (onShowProductLocationInfo && item.title) {
            onShowProductLocationInfo(item.title, barcode);
          }
          
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
              asin: asinArray[0], // Set first ASIN as default
              boxSize: docData.boxSize ? String(docData.boxSize) : '',
              packingMaterial: docData.packingMaterial ? String(docData.packingMaterial) : '',
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
          selectedAsins: asinValue ? [asinValue] : [],
          boxSize: docData.boxSize ? String(docData.boxSize) : prev.boxSize,
          packingMaterial: docData.packingMaterial ? String(docData.packingMaterial) : prev.packingMaterial,
        }));
        setBarcodeSearchMessage('Product name, unit, and ASIN auto-filled from scanned products.');
        
        // Show existing product locations if available
        if (onShowProductLocationInfo && docData.name) {
          onShowProductLocationInfo(docData.name, barcode);
        }
        
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
              asin: asinArray[0], // Set first ASIN as default
              boxSize: '',
              packingMaterial: '',
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
        
        // Show existing product locations if available
        if (onShowProductLocationInfo && item.title) {
          onShowProductLocationInfo(item.title, barcode);
        }
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
    
    // Prevent double submission
    if (isSubmittingRef.current || isLoading) {
      return;
    }
    
    if (validate()) {
      // Ensure supplier and storeName are set to first option if not selected
      const supplier = formData.supplier || supplierOptions[0].value;
      const storeName = formData.storeName || 'supply & serve';
      
      // Use selected ASINs if available, otherwise fall back to single ASIN
      const asinsToUse = formData.selectedAsins.length > 0 ? formData.selectedAsins : (formData.asin ? [formData.asin] : []);
      
      const stockData = locationEntries.map(entry => ({
        name: formData.name,
        quantity: parseInt(entry.quantity),
        price: (user?.role === 'admin' || user?.role === 'fahiz' || user?.role === 'aphy' || user?.role === 'supply_serve') ? parseFloat(formData.price) : 0,
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
        storeName: storeName === 'other' ? otherStoreName : storeName,
        boxSize: formData.boxSize || null,
        packingMaterial: formData.packingMaterial || null
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
      
      isSubmittingRef.current = true;
      try {
        await onSubmit(stockData);
      } catch (error) {
        console.error('Error adding stock:', error);
      } finally {
        isSubmittingRef.current = false;
      }
    }
  };

  const handleConfirmDuplicate = async () => {
    if (pendingStockData && !isSubmittingRef.current && !isLoading) {
      isSubmittingRef.current = true;
      try {
        await onSubmit(pendingStockData);
      } catch (error) {
        console.error('Error adding stock:', error);
      } finally {
        isSubmittingRef.current = false;
        setIsDuplicateModalOpen(false);
        setPendingStockData(null);
        setDuplicateInfo(null);
      }
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
        selectedAsins: selectedAsins, // Store the array of selected ASINs
        boxSize: pendingAsinData.boxSize || prev.boxSize,
        packingMaterial: pendingAsinData.packingMaterial || prev.packingMaterial,
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
          {(user?.role === 'admin' || user?.role === 'fahiz' || user?.role === 'aphy' || user?.role === 'supply_serve') && (
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

        {!isSupplyServe && (user?.role === 'admin' || user?.role === 'staff' || user?.role === 'manager') && (
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
                options={storeNameSelectOptions}
              />
            </div>
                
            {showOtherStoreInput && (<div>
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
            </div>)}

          </div>
        )}

        {/* {showOtherStoreInput && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
          </div>
        )}
         */}
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