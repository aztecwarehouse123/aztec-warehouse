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
  locationCode: string;
  shelfNumber: string;
  existingProducts: StockItem[];
  newProductName: string;
}

const LocationConfirmationModal: React.FC<LocationConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  locationCode,
  shelfNumber,
  existingProducts,
  newProductName
}) => {
  const totalProducts = existingProducts.length;
  const totalQuantity = existingProducts.reduce((sum, product) => sum + product.quantity, 0);

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
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                Current products in this location:
              </p>
              <ul className="mt-2 space-y-1">
                {existingProducts.map((product, index) => (
                  <li key={index} className="text-sm text-amber-700 dark:text-amber-300">
                    • {product.name} ({product.quantity} units)
                  </li>
                ))}
              </ul>
              <p className="text-sm text-amber-800 dark:text-amber-200 mt-2">
                Total: {totalProducts} product{totalProducts !== 1 ? 's' : ''} ({totalQuantity} units)
              </p>
            </div>
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
