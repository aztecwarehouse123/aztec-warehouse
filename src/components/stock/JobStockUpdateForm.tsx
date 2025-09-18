import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { StockItem } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface JobStockUpdateFormProps {
  item: StockItem;
  onSubmit: (data: { id: string; quantity: number; reason: string; storeName: string; locationCode: string; shelfNumber: string }) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

interface LocationInfo {
  locationCode: string;
  shelfNumber: string;
  quantity: number;
  storeName: string;
}

  // const predefinedStores = ['supply & serve', 'APHY', 'AZTEC', 'ZK', 'Fahiz'];

const JobStockUpdateForm: React.FC<JobStockUpdateFormProps> = ({ item, onSubmit, onCancel, isLoading }) => {
  const [deductQuantity, setDeductQuantity] = useState<string>('');
  const [reason, setReason] = useState<string>('stock sold');
  const [otherReason, setOtherReason] = useState<string>('');
  const [storeName, setStoreName] = useState<string>('');
  const [availableLocations, setAvailableLocations] = useState<LocationInfo[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const { isDarkMode } = useTheme();

  // Remove store selection logic since we'll auto-populate from location

  // Fetch available locations for this product
  useEffect(() => {
    const fetchLocations = async () => {
      setIsLoadingLocations(true);
      try {
        // Try exact match first
        let q = query(collection(db, 'inventory'), where('barcode', '==', item.barcode));
        let snapshot = await getDocs(q);
        
        // If no results, try with string conversion and trimming
        if (snapshot.empty && item.barcode) {
          const trimmedBarcode = String(item.barcode).trim();
          q = query(collection(db, 'inventory'), where('barcode', '==', trimmedBarcode));
          snapshot = await getDocs(q);
        }
        
        // If still no results, try searching by name as fallback
        if (snapshot.empty && item.name) {
          q = query(collection(db, 'inventory'), where('name', '==', item.name));
          snapshot = await getDocs(q);
        }
        
        const locations: LocationInfo[] = [];
        
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          
          if (data.locationCode && data.shelfNumber && (data.quantity || 0) > 0) {
            locations.push({
              // Normalize to strings to avoid strict equality mismatches (number vs string)
              locationCode: String(data.locationCode).trim(),
              shelfNumber: String(data.shelfNumber).trim(),
              quantity: Number(data.quantity) || 0,
              storeName: (data.storeName ? String(data.storeName) : 'Unknown').trim()
            });
          }
        });

        // Remove duplicates and sort by location
        const uniqueLocations = locations.filter((location, index, self) => 
          index === self.findIndex(l => 
            l.locationCode === location.locationCode && l.shelfNumber === location.shelfNumber
          )
        ).sort((a, b) => a.locationCode.localeCompare(b.locationCode));

        setAvailableLocations(uniqueLocations);
        
        // Auto-select first location if available
        if (uniqueLocations.length > 0) {
          const firstLocation = uniqueLocations[0];
          setSelectedLocation(`${firstLocation.locationCode}-${firstLocation.shelfNumber}`);
          setStoreName(firstLocation.storeName);
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
      } finally {
        setIsLoadingLocations(false);
      }
    };

    fetchLocations();
  }, [item.barcode]);

  // Handle location selection and auto-populate store name
  const handleLocationChange = (locationValue: string) => {
    setSelectedLocation(locationValue);
    
    if (locationValue) {
      const [locationCode, shelfNumber] = locationValue.split('-');
      const selectedLocationData = availableLocations.find(loc => 
        String(loc.locationCode) === String(locationCode) && String(loc.shelfNumber) === String(shelfNumber)
      );
      
      if (selectedLocationData) {
        setStoreName(selectedLocationData.storeName);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const quantityNum = Number(deductQuantity);
    if (!deductQuantity || quantityNum < 0) return;
    
    // Check against the selected location's quantity
    const maxQuantityForLocation = getMaxQuantityForLocation();
    if (quantityNum > maxQuantityForLocation) return;
    
    if (!selectedLocation) return;
    
    const finalReason = reason === 'other' ? otherReason : reason;
    const finalStoreName = storeName.trim();
    
    const [locationCode, shelfNumber] = selectedLocation.split('-');
    
    await onSubmit({ 
      id: item.id, 
      quantity: item.quantity - quantityNum, 
      reason: finalReason,
      storeName: finalStoreName,
      locationCode,
      shelfNumber
    });
  };

  const getMaxQuantityForLocation = () => {
    if (!selectedLocation) return item.quantity;
    const [locationCode, shelfNumber] = selectedLocation.split('-');
    const location = availableLocations.find(loc => 
      String(loc.locationCode) === String(locationCode) && String(loc.shelfNumber) === String(shelfNumber)
    );
    return location ? location.quantity : item.quantity;
  };

  const getValidationMessage = () => {
    const quantityNum = Number(deductQuantity);
    if (!deductQuantity || quantityNum < 0) {
      return "Quantity to deduct must be 0 or greater";
    }
    
    // Check against the selected location's quantity
    const maxQuantityForLocation = getMaxQuantityForLocation();
    if (quantityNum > maxQuantityForLocation) {
      return `Cannot deduct more than current stock at selected location (${maxQuantityForLocation} units)`;
    }
    
    if (!reason) {
      return "Please select a reason";
    }
    if (reason === 'other' && !otherReason.trim()) {
      return "Please specify the reason";
    }
    if (!selectedLocation) {
      return "Please select a location";
    }
    return null;
  };

  const validationMessage = getValidationMessage();

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
      <div className="space-y-4">
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {item.name}
          </h3>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {/* Total Stock: {item.quantity} units */}
            {selectedLocation && (
              <span className={` ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Selected Location: {getMaxQuantityForLocation()} units
              </span>
            )}
          </p>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Barcode: {item.barcode}
          </p>

          
        </div>

        {/* Location Selection */}
        <div className="space-y-2">
          <label 
            htmlFor="location" 
            className={`block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}
          >
            Select Location
          </label>
          {isLoadingLocations ? (
            <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <Loader2 size={16} className="animate-spin" />
              Loading locations...
            </div>
          ) : availableLocations.length > 0 ? (
            <Select
              id="location"
              value={selectedLocation}
              onChange={(e) => handleLocationChange(e.target.value)}
              required
              options={[
                { value: '', label: 'Select a location' },
                ...availableLocations.map(loc => ({
                  value: `${loc.locationCode}-${loc.shelfNumber}`,
                  label: `${loc.locationCode} - Shelf ${loc.shelfNumber} (${loc.quantity} units) - ${loc.storeName?.toUpperCase()}`
                }))
              ]}
              className={`${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-gray-900'} ${validationMessage ? 'border-red-500 focus:border-red-500' : ''}`}
            />
          ) : (
            <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              No locations with available stock found for this product
            </div>
          )}

        </div>

        <div className="space-y-2">
          <label 
            htmlFor="deductQuantity" 
            className={`block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}
          >
            Quantity to Deduct
          </label>
          <Input
            id="deductQuantity"
            type="number"
            min="0"
            max={getMaxQuantityForLocation()}
            value={deductQuantity}
            onChange={(e) => setDeductQuantity(e.target.value.replace(/^0+(?!$)/, ''))}
            placeholder="Enter quantity to deduct"
            required
            className={`${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-gray-900'} ${validationMessage ? 'border-red-500 focus:border-red-500' : ''}`}
          />
          {selectedLocation && (
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Max available at selected location: {getMaxQuantityForLocation()} units
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label 
            htmlFor="reason" 
            className={`block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}
          >
            Reason for Deduction
          </label>
          <Select
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            options={[
              { value: '', label: 'Select a reason' },
              { value: 'stock sold', label: 'Stock Sold' },
              { value: 'moved to fba', label: 'Moved to FBA' },
              { value: 'moved to mf', label: 'Moved to MF' },
              { value: 'damaged', label: 'Damaged' },
              { value: 'other', label: 'Other' }
            ]}
            className={`${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-gray-900'} ${validationMessage ? 'border-red-500 focus:border-red-500' : ''}`}
          />
        </div>

        {reason === 'other' && (
          <div className="space-y-2">
            <label 
              htmlFor="otherReason" 
              className={`block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}
            >
              Specify Reason
            </label>
            <Input
              id="otherReason"
              type="text"
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              placeholder="Enter the reason"
              required
              className={`${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-gray-900'} ${validationMessage ? 'border-red-500 focus:border-red-500' : ''}`}
            />
          </div>
        )}

        {/* Display selected store name */}
        {selectedLocation && storeName && (
          <div className="space-y-2">
            <label 
              className={`block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}
            >
              Store Name
            </label>
            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-100 border-slate-300'} border`}>
              <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                {storeName?.toUpperCase()}
              </span>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
                Automatically selected based on location
              </p>
            </div>
          </div>
        )}

        {validationMessage ? (
          <div className={`flex items-center space-x-2 text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
            <AlertCircle size={16} />
            <span>{validationMessage}</span>
          </div>
        ) : (
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            Enter the quantity to be deducted from current stock
          </p>
        )}
      </div>

      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !!validationMessage}
          className="min-w-[100px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            'Update'
          )}
        </Button>
      </div>
    </form>
  );
};

export default JobStockUpdateForm;
