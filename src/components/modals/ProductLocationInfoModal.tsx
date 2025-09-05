import React from 'react';
import { MapPin, Package } from 'lucide-react';
import Modal from './Modal';
import Button from '../ui/Button';
import { StockItem } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

interface ProductLocationInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  barcode: string;
  existingLocations: StockItem[];
}

const ProductLocationInfoModal: React.FC<ProductLocationInfoModalProps> = ({
  isOpen,
  onClose,
  productName,
  barcode,
  existingLocations
}) => {
  const { isDarkMode } = useTheme();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Product Location Information"
      size="lg"
    >
      <div className="space-y-4">
        <div className={`${isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <Package className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <h3 className={`font-semibold ${isDarkMode ? 'text-blue-200' : 'text-blue-900'}`}>Product Details</h3>
          </div>
          <div className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>
            <p><strong>Name:</strong> {productName}</p>
            <p><strong>Barcode:</strong> {barcode}</p>
          </div>
        </div>

        <div className={`${isDarkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'} border rounded-lg p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className={`w-5 h-5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
            <h3 className={`font-semibold ${isDarkMode ? 'text-green-200' : 'text-green-900'}`}>
              Current Locations ({existingLocations.length})
            </h3>
          </div>
          
          {existingLocations.length > 0 ? (
            <div className="space-y-2">
              {existingLocations.map((item, index) => (
                <div key={index} className={`${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'} rounded-lg p-3 border`}>
                  <div className="flex justify-between items-center">
                    <p className={`font-medium ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                      {item.locationCode} - {item.shelfNumber}
                    </p>
                    <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                      {item.quantity} units
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>This product is not currently in any location.</p>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button
            variant="secondary"
            onClick={onClose}
            className={!isDarkMode ? 'text-slate-700' : 'text-slate-100'}
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ProductLocationInfoModal;
