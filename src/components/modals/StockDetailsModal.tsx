import React from 'react';
import { StockItem } from '../../types';
import Modal from './Modal';
import { format } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

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
  const { user } = useAuth();
  
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
                item.quantity < 10
                  ? 'bg-red-100 text-red-800 '
                  : item.quantity <= 25
                    ? 'bg-yellow-100 text-yellow-800 '
                    : 'bg-green-100 text-green-800 '
              }`}>
                {item.quantity < 10
                  ? 'Critical Low Stock'
                  : item.quantity <= 25
                    ? 'Low Stock'
                    : 'In Stock'}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Quantity</p>
                <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.quantity}</p>
              </div>
              
              {user?.role === 'admin' && (
                <div>
                  <h3 className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>Price</h3>
                  <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                    {Number(item.price) > 0 ? `£${Number(item.price).toFixed(2)}` : 'Not set yet'}
                  </p>
                </div>
              )}
              
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Unit</p>
                <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.unit || '-'}</p>
              </div>
              
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Supplier</p>
                <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.supplier?.toUpperCase() || '-'}</p>
              </div>
              
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Location</p>
                <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.locationCode} - {item.shelfNumber}</p>
              </div>
              
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>ASIN</p>
                <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  {item.asin ? (
                    item.asin.includes(',') ? (
                      item.asin.split(',').map((asin, index) => (
                        <span key={index} className="block">
                          {asin.trim()}
                        </span>
                      ))
                    ) : (
                      item.asin
                    )
                  ) : (
                    '-'
                  )}
                </p>
              </div>
              
              <div>
                  <h3 className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>Status</h3>
                  <p className="mt-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      item.status === 'active' 
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {item.status === 'active' ? 'Active' : 'Pending'}
                    </span>
                  </p>
                </div>
                <div>
                  <h3 className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>Damaged Items</h3>
                  <p className="mt-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      item.damagedItems > 0 
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {item.damagedItems > 0 ? `${item.damagedItems} Damaged` : 'None'}
                    </span>
                  </p>
                </div>

                <div>
                  <h3 className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>Fulfillment Type</h3>
                  <p className="mt-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      item.fulfillmentType === 'fba' 
                        ? 'bg-blue-100 text-blue-700'
                        : item.fulfillmentType === 'mf'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {item.fulfillmentType === 'fba' 
                        ? 'FBA'
                        : item.fulfillmentType === 'mf'
                        ? 'MF'
                        : 'None'}
                    </span>
                  </p>
                </div>

                <div>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Barcode</p>
                <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.barcode || '-'}</p>
              </div>
              
                <div>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Last Updated</p>
                <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  {format(item.lastUpdated, 'MMM d, yyyy')}
                </p>
              </div>
                <div>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Store Name</p>
                <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  {item.storeName?.toUpperCase() || '-'}
                </p>
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
          <div className={`h-2 w-full ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} rounded-full overflow-hidden relative`}>
            <div 
              className={`h-full ${
                item.quantity < 10
                  ? 'bg-red-500' 
                  : item.quantity <= 25
                    ? 'bg-orange-500' 
                    : 'bg-green-500'
              }`}
              style={{ 
                width: `${Math.min((item.quantity / 50) * 100, 100)}%` 
              }}
            ></div>
            {/* Critical threshold marker */}
            <div 
              className={`absolute top-0 h-full w-0.5 ${isDarkMode ? 'bg-red-400' : 'bg-red-600'}`}
              style={{ left: `calc(${(10 / 50) * 100}% - 1px)` }}
              title="Critical Threshold (10 units)"
            ></div>
            {/* Low stock threshold marker */}
            <div 
              className={`absolute top-0 h-full w-0.5 ${isDarkMode ? 'bg-orange-400' : 'bg-orange-600'}`}
              style={{ left: `calc(${(25 / 50) * 100}% - 1px)` }}
              title="Low Stock Threshold (25 units)"
            ></div>
          </div>
          <div className={`mt-1 flex justify-between text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>0</span>
            <span>Critical: &lt;10</span>
            <span>Low: 10-25</span>
            <span>25+</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default StockDetailsModal;