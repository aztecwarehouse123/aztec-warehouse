import React from 'react';
import Modal from './Modal';
import Button from '../ui/Button';
import { AlertTriangle } from 'lucide-react';
import { StockItem } from '../../types';

interface LocationConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onMerge?: () => void; // New prop for merge functionality
  locationCode: string;
  shelfNumber: string;
  existingProducts: StockItem[];
  newProductName: string;
  newProductBarcode?: string; // New prop for new product's barcode
}

const LocationConfirmationModal: React.FC<LocationConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  onMerge,
  locationCode,
  shelfNumber,
  existingProducts,
  newProductName,
  newProductBarcode
}) => {
  // Filter out products with 0 quantity
  const activeProducts = existingProducts.filter(product => product.quantity > 0);
  const totalProducts = activeProducts.length;
  const totalQuantity = activeProducts.reduce((sum, product) => sum + product.quantity, 0);

  // Check if new product can be merged with existing product
  const canMerge = newProductBarcode && activeProducts.some(product => 
    product.barcode === newProductBarcode
  );

  // Find the product to merge with
  const productToMerge = canMerge ? activeProducts.find(product => 
    product.barcode === newProductBarcode
  ) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Location Already Occupied"
      size="md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-500 mt-1 flex-shrink-0" />
          <div className="space-y-2">
            <p className="text-gray-700 dark:text-gray-300">
              The location <strong>{locationCode}-{shelfNumber}</strong> already contains products.
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              {activeProducts.length > 0 ? (
                <>
                  <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                    Current products in this location:
                  </p>
                  <ul className="mt-2 space-y-1">
                    {activeProducts.map((product, index) => (
                      <li key={index} className="text-sm text-amber-700 dark:text-amber-300">
                        • {product.name} ({product.quantity} units)
                        {product.barcode && (
                          <span className="text-xs text-amber-600 dark:text-amber-400 ml-2">
                            Barcode: {product.barcode}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-amber-800 dark:text-amber-200 mt-2">
                    Total: {totalProducts} product{totalProducts !== 1 ? 's' : ''} ({totalQuantity} units)
                  </p>
                </>
              ) : (
                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                  This location appears to be empty (all products have 0 quantity).
                </p>
              )}
            </div>
            
            {canMerge && productToMerge && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                  Merge Available!
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  The product "{newProductName}" has the same barcode ({newProductBarcode}) as "{productToMerge.name}" 
                  which is already in this location. You can merge them to add quantity instead of creating a duplicate entry.
                </p>
              </div>
            )}
            
            <p className="text-gray-700 dark:text-gray-300">
              Do you still want to add <strong>{newProductName}</strong> to this location?
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="secondary"
            onClick={onCancel}
          >
            Cancel
          </Button>
          
          {canMerge && onMerge && (
            <Button
              onClick={onMerge}
              className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
            >
              Merge Products
            </Button>
          )}
          
          <Button
            onClick={onConfirm}
            className="bg-amber-600 hover:bg-amber-700 focus:ring-amber-500"
          >
            Yes, Add Product
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default LocationConfirmationModal;
