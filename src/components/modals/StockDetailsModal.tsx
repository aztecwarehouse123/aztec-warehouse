import React from 'react';
import { StockItem } from '../../types';
import Modal from './Modal';
import { format } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';

interface StockDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: StockItem;
}

const StockDetailsModal: React.FC<StockDetailsModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  const { isDarkMode } = useTheme();
  
  if (!item) return null;
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={item.name}
      size="xl"
    >
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-6">
          
          {/* Info */}
          <div className="w-full">
            <div className="mb-4 flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                item.quantity <= item.threshold * 0.4
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : item.quantity <= item.threshold
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              }`}>
                {item.quantity <= item.threshold * 0.4
                  ? 'Critical Low Stock'
                  : item.quantity <= item.threshold
                    ? 'Low Stock'
                    : 'In Stock'}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Quantity</p>
                <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.quantity}</p>
              </div>
              
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Price</p>
                <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>${item.price.toFixed(2)}</p>
              </div>
              
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Supplier</p>
                <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.supplier}</p>
              </div>
              
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Location</p>
                <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.locationCode} - {item.shelfNumber}</p>
              </div>
              
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Last Updated</p>
                <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  {format(item.lastUpdated, 'MMM d, yyyy')}
                </p>
              </div>
              
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Low Stock Threshold</p>
                <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.threshold} units</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Stock Level Indicator */}
        <div className={`pt-3 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex justify-between items-center mb-2">
            <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Stock Level</span>
            <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {item.quantity} units
            </span>
          </div>
          <div className={`h-2 w-full ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} rounded-full overflow-hidden`}>
            <div 
              className={`h-full ${
                item.quantity <= item.threshold * 0.4
                  ? 'bg-red-500' 
                  : item.quantity <= item.threshold
                    ? 'bg-yellow-500' 
                    : 'bg-green-500'
              }`}
              style={{ 
                width: `${Math.min((item.quantity / (item.threshold * 2)) * 100, 100)}%` 
              }}
            ></div>
          </div>
          <div className={`mt-1 flex justify-between text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>0</span>
            <span>Critical: {Math.round(item.threshold * 0.4)}</span>
            <span>Threshold: {item.threshold}</span>
            <span>{item.threshold * 2}+</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default StockDetailsModal;