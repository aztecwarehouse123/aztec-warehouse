import React, { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { StockItem } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

interface OutboundEditFormProps {
  item: StockItem;
  onSubmit: (data: { id: string; quantity: number; reason: string; storeName: string }) => Promise<void>;
  isLoading: boolean;
}

  const predefinedStores = ['supply & serve', 'APHY', 'AZTEC', 'ZK', 'Fahiz'];

const OutboundEditForm: React.FC<OutboundEditFormProps> = ({ item, onSubmit, isLoading }) => {
  const [deductQuantity, setDeductQuantity] = useState<string>('');
  const [reason, setReason] = useState<string>('stock sold');
  const [otherReason, setOtherReason] = useState<string>('');
  const storeOptions = predefinedStores.includes(item.storeName)
    ? predefinedStores
    : [item.storeName, ...predefinedStores];
  const storeSelectOptions = [...storeOptions, 'other'];
  const [storeName, setStoreName] = useState<string>(item.storeName || storeOptions[0] || '');
  const [otherStoreName, setOtherStoreName] = useState<string>('');
  const { isDarkMode } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const quantityNum = Number(deductQuantity);
    if (!deductQuantity || quantityNum <= 0 || quantityNum > item.quantity) return;
    const finalReason = reason === 'other' ? otherReason : reason;
    const finalStoreName = storeName === 'other' ? otherStoreName.trim() : storeName.trim();
    await onSubmit({ 
      id: item.id, 
      quantity: item.quantity - quantityNum, 
      reason: finalReason,
      storeName: finalStoreName
    });
  };

  const getValidationMessage = () => {
    const quantityNum = Number(deductQuantity);
    if (!deductQuantity || quantityNum <= 0) {
      return "Quantity to deduct must be greater than 0";
    }
    if (quantityNum > item.quantity) {
      return `Cannot deduct more than current stock (${item.quantity} units)`;
    }
    if (!reason) {
      return "Please select a reason";
    }
    if (reason === 'other' && !otherReason.trim()) {
      return "Please specify the reason";
    }
    if (!storeName.trim() || (storeName === 'other' && !otherStoreName.trim())) {
      return "Please select or enter the store name";
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
            Current Stock: {item.quantity} units
          </p>
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
            min="1"
            max={item.quantity}
            value={deductQuantity}
            onChange={(e) => setDeductQuantity(e.target.value.replace(/^0+(?!$)/, ''))}
            placeholder="Enter quantity to deduct"
            required
            className={`${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-gray-900'} ${validationMessage ? 'border-red-500 focus:border-red-500' : ''}`}
          />
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

        <div className="space-y-2">
          <label 
            htmlFor="storeName" 
            className={`block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}
          >
            Store Name
          </label>
          <Select
            id="storeName"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            options={storeSelectOptions.map(store => ({ value: store, label: store === 'other' ? 'OTHER' : store?.toUpperCase() }))}
            required
            className={`${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-gray-900'} ${validationMessage ? 'border-red-500 focus:border-red-500' : ''}`}
          />
          {storeName === 'other' && (
            <Input
              id="otherStoreName"
              type="text"
              value={otherStoreName}
              onChange={(e) => setOtherStoreName(e.target.value)}
              placeholder="Enter store name"
              required
              className={`${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-gray-900'} ${validationMessage ? 'border-red-500 focus:border-red-500' : ''}`}
            />
          )}
        </div>

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

export default OutboundEditForm; 